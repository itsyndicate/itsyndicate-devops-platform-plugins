import React from 'react';
import S3Icon from './amazon-s3-simple-storage-service.svg';
import APIGatewayIcon from './Arch_Amazon-API-Gateway_32.svg';
import DynamoDBIcon from './Arch_Amazon-DynamoDB_32.svg';
import EC2Icon from './Arch_Amazon-EC2_32.svg';
import EC2ImageIcon from './Arch_Amazon-EC2-Image-Builder_32.svg';
import ECSIcon from './Arch_Amazon-Elastic-Container-Service_32.svg';
import EKSIcon from './Arch_Amazon-Elastic-Kubernetes-Service_32.svg';
import RDSIcon from './Arch_Amazon-RDS_32.svg';
import LambdaIcon from './Arch_AWS-Lambda_32.svg';
import EBSVolumeIcon from './Elastic Block Store.svg';
import SnapshotIcon from './Res_Amazon-Elastic-Block-Store_Snapshot_48.svg';
import VPCIcon from './Virtual-private-cloud-VPC_32.svg';
import DBIcon from './Arch-Category_Database_32.svg';

export const awsIcons: { [key: string]: React.ReactNode } = {
  s3Buckets: <img src={S3Icon} alt="S3" />,
  apiGateways: <img src={APIGatewayIcon} alt="API Gateway" />,
  databases: <img src={DBIcon} alt="DB" />, // Represent both RDS and DynamoDB
  rds: <img src={RDSIcon} alt="RDS" />,
  dynamoDBTables: <img src={DynamoDBIcon} alt="DynamoDB" />,
  ec2Instances: <img src={EC2Icon} alt="EC2" />,
  ebsVolumes: <img src={EBSVolumeIcon} alt="EBS Volume" />,
  ecsClusters: <img src={ECSIcon} alt="ECS" />,
  kubernetes: <img src={EKSIcon} alt="EKS" />,
  lambdas: <img src={LambdaIcon} alt="Lambda" />,
  images: <img src={EC2ImageIcon} alt="EC2 Image" />,
  snapshots: <img src={SnapshotIcon} alt="Snapshot" />,
  vpcs: <img src={VPCIcon} alt="VPC" />,
};