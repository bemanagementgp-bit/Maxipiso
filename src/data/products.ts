export type Category =
  | "Porcelanato"
  | "Cer�mica"
  | "Madera"
  | "Placas"
  | "Accesorios";

export interface Product {
  id: string;
  name: string;
  category: Category;
  description: string;
  image: string;
  images?: string[];
  specs?: Record<string, string>;
}

export const CATEGORIES: Category[] = [
  "Porcelanato",
  "Cer�mica",
  "Madera",
  "Placas",
  "Accesorios",
];

export const products: Product[] = [];
