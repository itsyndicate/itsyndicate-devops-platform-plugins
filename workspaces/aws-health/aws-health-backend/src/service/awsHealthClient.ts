import {
    HealthClient,
    DescribeEventsCommand,
    DescribeEventDetailsCommand,
    Event,
    HealthServiceException,
  } from '@aws-sdk/client-health';
  
  export class AWSHealthService {
    private client: HealthClient;
  
    constructor() {
      this.client = new HealthClient({ region: 'us-east-1' });
    }
  
    private async fetchAllEvents(params: any): Promise<Event[]> {
      let allEvents: Event[] = [];
      let nextToken: string | undefined = undefined;
  
      do {
        try {
          const command = new DescribeEventsCommand({ ...params, nextToken });
          const data = await this.client.send(command);
  
          allEvents = allEvents.concat(data.events || []);
          nextToken = data.nextToken;
        } catch (error) {
          if (error instanceof HealthServiceException && error.$retryable) {
            throw new Error('AWS Health API rate limit exceeded.');
          } else {
            throw error;
          }
        }
      } while (nextToken);
  
      return allEvents;
    }
  
    private async addEventDetails(events: Event[]): Promise<EventWithDetails[]> {
      const eventDetailsCommands = events.map(event =>
        new DescribeEventDetailsCommand({ eventArns: [event.arn] })
      );
  
      const eventDetails = await Promise.all(
        eventDetailsCommands.map(command => this.client.send(command))
      );
  
      return events.map((event, index) => {
        const details = eventDetails[index].successfulSet[0]?.eventDescription?.latestDescription || 'No details available';
        return { ...event, details };
      });
    }
  
    private addEventLinks(events: Event[]): EventWithLink[] {
      return events.map(event => {
        const eventId = event.arn;
        const eventTypeCategory = event.eventTypeCategory;
        let linkCategory = '';
  
        switch (eventTypeCategory) {
          case 'issue':
            linkCategory = 'open-issues';
            break;
          case 'accountNotification':
            linkCategory = 'other-notifications';
            break;
          case 'scheduledChange':
            linkCategory = 'scheduled-changes';
            break;
          default:
            linkCategory = 'event-log';
            break;
        }
  
        const link = `https://health.console.aws.amazon.com/health/home#/account/dashboard/${linkCategory}?eventID=${eventId}`;
  
        return { ...event, link };
      });
    }
  
    async getOpenAndRecentIssues(): Promise<EventWithLink[]> {
      const params = {
        filter: {
          eventStatusCodes: ['open', 'upcoming'],
        },
      };
  
      const events = await this.fetchAllEvents(params);
      const eventsWithDetails = await this.addEventDetails(events);
      return this.addEventLinks(eventsWithDetails);
    }
  
    async getScheduledChanges(): Promise<EventWithLink[]> {
      const params = {
        filter: {
          eventTypeCategories: ['scheduledChange'],
        },
      };
  
      const events = await this.fetchAllEvents(params);
      const eventsWithDetails = await this.addEventDetails(events);
      return this.addEventLinks(eventsWithDetails);
    }
  
    async getNotifications(): Promise<EventWithLink[]> {
      const params = {
        filter: {
          eventTypeCategories: ['accountNotification'],
        },
      };
  
      const events = await this.fetchAllEvents(params);
      const eventsWithDetails = await this.addEventDetails(events);
      return this.addEventLinks(eventsWithDetails);
    }
  
    async getEventLog(): Promise<EventWithLink[]> {
      const params = {
        filter: {
          startTimes: [
            {
              from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              to: new Date(),
            },
          ],
        },
      };
  
      const events = await this.fetchAllEvents(params);
      const eventsWithDetails = await this.addEventDetails(events);
      return this.addEventLinks(eventsWithDetails);
    }
  }
  
  export type EventWithDetails = Event & { details: string };
  export type EventWithLink = EventWithDetails & { link: string };
  