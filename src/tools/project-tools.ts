import { z } from 'zod';
import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentProject, FreeAgentTask, FreeAgentTimeslip } from '../types/freeagent/index.js';
import { transformProject, transformTask, transformTimeslip } from '../transformers/project-transformer.js';
import { handleToolError } from '../utils/error-handler.js';
import { normalizeContactId, normalizeProjectId } from '../utils/validators.js';
import { FREEAGENT_API_BASE } from '../config.js';
import { sanitizeInput } from '../utils/sanitizer.js';

// Create project schema
export const createProjectSchema = z.object({
  contact_id: z.string().min(1),
  name: z.string().min(1),
  budget_units: z.enum(['Hours', 'Days', 'Monetary']),
  budget: z.number().optional(),
  currency: z.string().length(3).default('GBP'),
  normal_billing_rate: z.number().optional(),
  hours_per_day: z.number().optional(),
  is_ir35: z.boolean().default(false),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export async function createProject(
  client: FreeAgentClient,
  input: CreateProjectInput,
  contactNameLookup?: Map<string, string>
) {
  try {
    const validated = createProjectSchema.parse(input);

    const projectData: Record<string, unknown> = {
      contact: normalizeContactId(validated.contact_id, FREEAGENT_API_BASE),
      name: sanitizeInput(validated.name),
      budget_units: validated.budget_units,
      currency: validated.currency.toUpperCase(),
      is_ir35: validated.is_ir35,
    };

    if (validated.budget !== undefined) projectData['budget'] = validated.budget.toString();
    if (validated.normal_billing_rate !== undefined) {
      projectData['normal_billing_rate'] = validated.normal_billing_rate.toString();
    }
    if (validated.hours_per_day !== undefined) {
      projectData['hours_per_day'] = validated.hours_per_day.toString();
    }
    if (validated.starts_on) projectData['starts_on'] = validated.starts_on;
    if (validated.ends_on) projectData['ends_on'] = validated.ends_on;

    const response = await client.post<{ project: FreeAgentProject }>('/projects', {
      project: projectData,
    });

    return transformProject(response.project, contactNameLookup);
  } catch (error) {
    handleToolError(error, 'create_project');
  }
}

// Update project schema
export const updateProjectSchema = z.object({
  project_id: z.string().min(1),
  name: z.string().optional(),
  budget: z.number().optional(),
  normal_billing_rate: z.number().optional(),
  hours_per_day: z.number().optional(),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['Active', 'Completed', 'Cancelled', 'Hidden']).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export async function updateProject(
  client: FreeAgentClient,
  input: UpdateProjectInput,
  contactNameLookup?: Map<string, string>
) {
  try {
    const validated = updateProjectSchema.parse(input);
    const { project_id, ...fields } = validated;

    const projectData: Record<string, unknown> = {};

    if (fields.name !== undefined) projectData['name'] = sanitizeInput(fields.name);
    if (fields.budget !== undefined) projectData['budget'] = fields.budget.toString();
    if (fields.normal_billing_rate !== undefined) {
      projectData['normal_billing_rate'] = fields.normal_billing_rate.toString();
    }
    if (fields.hours_per_day !== undefined) {
      projectData['hours_per_day'] = fields.hours_per_day.toString();
    }
    if (fields.starts_on !== undefined) projectData['starts_on'] = fields.starts_on;
    if (fields.ends_on !== undefined) projectData['ends_on'] = fields.ends_on;
    if (fields.status !== undefined) projectData['status'] = fields.status;

    const response = await client.put<{ project: FreeAgentProject }>(
      `/projects/${project_id}`,
      { project: projectData }
    );

    return transformProject(response.project, contactNameLookup);
  } catch (error) {
    handleToolError(error, 'update_project');
  }
}

// Create task schema
export const createTaskSchema = z.object({
  project_id: z.string().min(1),
  name: z.string().min(1),
  is_billable: z.boolean().default(true),
  billing_rate: z.number().optional(),
  billing_period: z.enum(['hour', 'day', 'week', 'month', 'year']).optional(),
  budget: z.number().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export async function createTask(
  client: FreeAgentClient,
  input: CreateTaskInput
) {
  try {
    const validated = createTaskSchema.parse(input);

    const taskData: Record<string, unknown> = {
      project: normalizeProjectId(validated.project_id, FREEAGENT_API_BASE),
      name: sanitizeInput(validated.name),
      is_billable: validated.is_billable,
    };

    if (validated.billing_rate !== undefined) {
      taskData['billing_rate'] = validated.billing_rate.toString();
    }
    if (validated.billing_period) taskData['billing_period'] = validated.billing_period;
    if (validated.budget !== undefined) taskData['budget'] = validated.budget.toString();

    const response = await client.post<{ task: FreeAgentTask }>('/tasks', {
      task: taskData,
    });

    return transformTask(response.task);
  } catch (error) {
    handleToolError(error, 'create_task');
  }
}

// Create timeslip schema
export const createTimeslipSchema = z.object({
  project_id: z.string().min(1),
  task_id: z.string().min(1),
  user_id: z.string().min(1),
  dated_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().positive(),
  comment: z.string().optional(),
});

export type CreateTimeslipInput = z.infer<typeof createTimeslipSchema>;

export async function createTimeslip(
  client: FreeAgentClient,
  input: CreateTimeslipInput
) {
  try {
    const validated = createTimeslipSchema.parse(input);

    const timeslipData: Record<string, unknown> = {
      project: normalizeProjectId(validated.project_id, FREEAGENT_API_BASE),
      task: `${FREEAGENT_API_BASE}/tasks/${validated.task_id}`,
      user: `${FREEAGENT_API_BASE}/users/${validated.user_id}`,
      dated_on: validated.dated_on,
      hours: validated.hours.toString(),
    };

    if (validated.comment) timeslipData['comment'] = sanitizeInput(validated.comment);

    const response = await client.post<{ timeslip: FreeAgentTimeslip }>('/timeslips', {
      timeslip: timeslipData,
    });

    return transformTimeslip(response.timeslip);
  } catch (error) {
    handleToolError(error, 'create_timeslip');
  }
}
