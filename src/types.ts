import { LucideIcon } from "lucide-react";

export type CarStatus = 'Відстійник' | 'Очікує' | 'В роботі' | 'Готово' | 'Видано';
export type TaskStatus = 'Нова' | 'В роботі' | 'Виконана' | 'Закрита';

export interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  mechanicId: string;
  carId: string;
  clientId: string;
  cost?: number;
  notes?: string;
  photo?: string;
  parts?: { itemId: string; quantity: number }[];
  receptionDate: string;
  completionDate?: string;
}

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: string;
  plate: string;
  vin?: string;
  clientId: string;
  status: CarStatus;
  statusUpdatedAt?: string; // ISO string
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  debt: number; // This will be calculated, but kept for legacy/storage if needed
  notes?: string;
}

export interface Mechanic {
  id: string;
  name: string;
  isBusy: boolean;
  userId?: string; // Link to User account
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  unit: string; // e.g., 'шт', 'л', 'кг'
  type: 'REGULAR' | 'ONE_TIME';
}

export interface Transaction {
  id: string;
  itemId: string;
  type: 'INCOME' | 'EXPENSE' | 'WRITE_OFF';
  quantity: number;
  price?: number;
  date: string;
  notes?: string;
  clientId?: string;
  carId?: string;
  taskId?: string;
  userId?: string;
}

export type ScreenType = 'HOME' | 'CLIENTS' | 'TASKS' | 'MECHANICS' | 'WAREHOUSE' | 'USERS' | 'PROFILE' | 'PUBLIC' | 'HANGAR' | 'SCHEDULE' | 'MORE' | 'PARKING';

export interface Appointment {
  id: string;
  clientId: string;
  carId?: string;
  carPlate: string;
  carModel: string;
  date: string; // ISO string
  time: string; // "10:00"
  status: 'SCHEDULED' | 'CHECKED_IN' | 'CANCELLED';
  notes?: string;
}

export type Role = 'ADMIN' | 'EMPLOYEE';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: Role;
  name: string;
  avatar?: string;
  phone?: string;
  email?: string;
  bio?: string;
}

export interface NavItem {
  id: ScreenType;
  label: string;
  icon: LucideIcon;
}
