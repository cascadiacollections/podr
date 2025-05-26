import webpack from 'webpack';

declare namespace ApiInlinerPlugin {
  interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    [key: string]: any;
  }

  interface EndpointConfig {
    url: string;
    outputFile: string;
    fallbackData: any;
    inlineAsVariable?: boolean;
    variableName?: string;
    requestOptions?: RequestOptions;
    saveAsFile?: boolean;
  }

  interface ApiInlinerOptions {
    endpoints: EndpointConfig | EndpointConfig[];
    production?: boolean;
    inlineAsVariable?: boolean;
    variablePrefix?: string;
    saveAsFile?: boolean;
    requestTimeout?: number;
    retryCount?: number;
    outputPath?: string;
    onSuccess?: (data: any, endpoint: EndpointConfig) => void;
    onError?: (error: Error, endpoint: EndpointConfig) => void;
  }
}

declare class ApiInlinerPlugin {
  constructor(options?: ApiInlinerPlugin.ApiInlinerOptions);
  apply(compiler: webpack.Compiler): void;
}

export = ApiInlinerPlugin;