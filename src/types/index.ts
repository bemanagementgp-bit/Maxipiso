export type UserRole = "ADMIN" | "VIEWER";

export type Product = {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
  descripcion?: string;
  precio: number;
  imagen?: string;
  categoria?: string;
  subcategoria?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ChangeLog = {
  id: string;
  productId: string;
  usuarioId: string;
  campo: string;
  valorAnterior?: string;
  valorNuevo?: string;
  tipo: "CREATE" | "UPDATE" | "DELETE";
  fechaCambio: Date;
};

export type User = {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
