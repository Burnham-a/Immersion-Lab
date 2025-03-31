// @/types/StreamGridItemProps.ts
export interface StreamGridItemProps {
  id: string;
  name: string;
  models: { items: { name: string; option: string }[] };
  commitsCount: number;
  description: string;
  role?: string; // Added optional 'role' property
}

export interface ModelItem {
  name: string;
  option: string;
}
