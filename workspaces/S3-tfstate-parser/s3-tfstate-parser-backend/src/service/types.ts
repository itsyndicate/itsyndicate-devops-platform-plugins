export interface TFState {
    version: number;
    terraform_version: string;
    serial: number;
    lineage: string;
    outputs: Record<string, any>;
    resources: TFResource[];
  }
  
  export interface TFResource {
    module?: string;
    mode: string;
    type: string;
    name: string;
    provider: string;
    instances: TFInstance[];
  }
  
  export interface TFInstance {
    schema_version: number;
    attributes: Record<string, any>;
    private: string;
  }
  