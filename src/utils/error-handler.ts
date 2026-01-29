import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { isHttpError } from '../api/retry-handler.js';

// Custom error codes for FreeAgent-specific errors
export const FREEAGENT_ERROR_CODES = {
  AUTH_REQUIRED: -32001,
  INSUFFICIENT_PERMISSIONS: -32002,
  RESOURCE_NOT_FOUND: -32003,
  RATE_LIMIT_EXCEEDED: -32000,
} as const;

interface ErrorMapping {
  code: number;
  message: string;
}

const HTTP_TO_MCP_ERROR_MAP: Record<number, ErrorMapping> = {
  400: { code: ErrorCode.InvalidParams, message: 'Invalid parameters' },
  401: { code: FREEAGENT_ERROR_CODES.AUTH_REQUIRED, message: 'Authentication required' },
  403: { code: FREEAGENT_ERROR_CODES.INSUFFICIENT_PERMISSIONS, message: 'Insufficient permissions' },
  404: { code: FREEAGENT_ERROR_CODES.RESOURCE_NOT_FOUND, message: 'Resource not found' },
  422: { code: ErrorCode.InvalidParams, message: 'Validation failed' },
  429: { code: FREEAGENT_ERROR_CODES.RATE_LIMIT_EXCEEDED, message: 'Rate limit exceeded' },
  500: { code: ErrorCode.InternalError, message: 'FreeAgent server error' },
  502: { code: ErrorCode.InternalError, message: 'FreeAgent server error' },
  503: { code: ErrorCode.InternalError, message: 'FreeAgent temporarily unavailable' },
  504: { code: ErrorCode.InternalError, message: 'FreeAgent timeout' },
};

export function toMcpError(error: unknown): McpError {
  if (error instanceof McpError) {
    return error;
  }

  if (isHttpError(error)) {
    const mapping = HTTP_TO_MCP_ERROR_MAP[error.status];
    if (mapping) {
      return new McpError(
        mapping.code,
        `${mapping.message}: ${error.message}`,
        { httpStatus: error.status, retryAfter: error.retryAfter }
      );
    }

    return new McpError(
      ErrorCode.InternalError,
      `HTTP ${error.status}: ${error.message}`,
      { httpStatus: error.status }
    );
  }

  if (error instanceof Error) {
    // Check for authentication-related errors
    if (error.message.includes('Not authenticated') || error.message.includes('expired')) {
      return new McpError(
        FREEAGENT_ERROR_CODES.AUTH_REQUIRED,
        error.message
      );
    }

    // Check for rate limit errors
    if (error.message.includes('rate limit')) {
      return new McpError(
        FREEAGENT_ERROR_CODES.RATE_LIMIT_EXCEEDED,
        error.message
      );
    }

    return new McpError(
      ErrorCode.InternalError,
      error.message
    );
  }

  return new McpError(
    ErrorCode.InternalError,
    'An unknown error occurred'
  );
}

export function handleResourceError(error: unknown, uri: string): never {
  const mcpError = toMcpError(error);
  if (mcpError.code === FREEAGENT_ERROR_CODES.RESOURCE_NOT_FOUND) {
    throw new McpError(
      FREEAGENT_ERROR_CODES.RESOURCE_NOT_FOUND,
      `Resource not found: ${uri}`,
      { uri }
    );
  }
  throw mcpError;
}

export function handleToolError(error: unknown, toolName: string): never {
  const mcpError = toMcpError(error);
  throw new McpError(
    mcpError.code,
    `Tool '${toolName}' failed: ${mcpError.message}`,
    { toolName, ...(typeof mcpError.data === 'object' ? mcpError.data : {}) }
  );
}
