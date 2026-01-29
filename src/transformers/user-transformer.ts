import type { FreeAgentUser } from '../types/freeagent/index.js';
import type { LLMUser } from '../types/llm/index.js';
import { extractId, computeFullName } from './common.js';

export function transformUser(user: FreeAgentUser): LLMUser {
  return {
    id: extractId(user.url),
    name: computeFullName(user.first_name, user.last_name),
    email: user.email,
    role: user.role,
    permissionLevel: user.permission_level,
  };
}

export function transformUsers(users: FreeAgentUser[]): LLMUser[] {
  return users.map(transformUser);
}
