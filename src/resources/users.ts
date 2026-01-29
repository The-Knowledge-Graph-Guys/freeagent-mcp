import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentUser } from '../types/freeagent/index.js';
import { transformUser, transformUsers } from '../transformers/user-transformer.js';
import { handleResourceError } from '../utils/error-handler.js';

export async function getUsers(client: FreeAgentClient) {
  try {
    const users = await client.fetchAllPages<FreeAgentUser>(
      '/users',
      'users'
    );
    return transformUsers(users);
  } catch (error) {
    handleResourceError(error, 'freeagent://users');
  }
}

export async function getUser(client: FreeAgentClient, id: string) {
  try {
    const response = await client.get<{ user: FreeAgentUser }>(`/users/${id}`);
    return transformUser(response.user);
  } catch (error) {
    handleResourceError(error, `freeagent://users/${id}`);
  }
}

export async function getCurrentUser(client: FreeAgentClient) {
  try {
    const response = await client.get<{ user: FreeAgentUser }>('/users/me');
    return transformUser(response.user);
  } catch (error) {
    handleResourceError(error, 'freeagent://users/me');
  }
}
