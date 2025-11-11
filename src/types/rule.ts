export interface RuleStep {
	id: string;
	name: string;
	pattern: string;
	required: boolean;
	isInferencePoint?: boolean;
	timeout?: number;
}

export interface ValidationRule {
	id: string;
	name: string;
	description: string;
	steps: RuleStep[];
	startPattern: string;
	endPattern?: string;
	maxDuration?: number;
	createdAt: string;
	updatedAt: string;
}

export interface RuleFormData {
	name: string;
	description: string;
	startPattern: string;
	endPattern: string;
	maxDuration: number;
	steps: Omit<RuleStep, 'id'>[];
}