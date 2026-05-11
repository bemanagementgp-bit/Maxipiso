export interface Distributor {
  id: string;
  name: string;
  city: string;
  province: string;
  phone?: string;
  email?: string;
  address?: string;
  lat: number;
  lng: number;
}

export const distributors: Distributor[] = [
  {
    id: "dist-bsas-1",
    name: "Pisos del Sur",
    city: "Buenos Aires",
    province: "CABA",
    phone: "+54 11 4444-1234",
    address: "Av. Corrientes 2500",
    lat: -34.6037,
    lng: -58.3816,
  },
  {
    id: "dist-rosario-1",
    name: "Revestimientos Rosario",
    city: "Rosario",
    province: "Santa Fe",
    phone: "+54 341 555-0001",
    address: "Bv. Oroño 750",
    lat: -32.9468,
    lng: -60.6393,
  },
  {
    id: "dist-cordoba-1",
    name: "Pisos Córdoba Centro",
    city: "Córdoba",
    province: "Córdoba",
    phone: "+54 351 444-2200",
    address: "Av. Colón 1200",
    lat: -31.4201,
    lng: -64.1888,
  },
  {
    id: "dist-mendoza-1",
    name: "Revestimientos del Oeste",
    city: "Mendoza",
    province: "Mendoza",
    phone: "+54 261 333-5500",
    address: "Av. San Martín 900",
    lat: -32.8908,
    lng: -68.8272,
  },
  {
    id: "dist-tucuman-1",
    name: "Pisos del Norte",
    city: "San Miguel de Tucumán",
    province: "Tucumán",
    phone: "+54 381 222-8800",
    address: "Av. Sarmiento 600",
    lat: -26.8083,
    lng: -65.2176,
  },
  {
    id: "dist-lp-1",
    name: "Distribuidora La Plata",
    city: "La Plata",
    province: "Buenos Aires",
    phone: "+54 221 470-3300",
    address: "Calle 12 Nro 1450",
    lat: -34.9215,
    lng: -57.9545,
  },
  {
    id: "dist-neuquen-1",
    name: "Patagonia Pisos",
    city: "Neuquén",
    province: "Neuquén",
    phone: "+54 299 448-7700",
    address: "Av. Argentina 1100",
    lat: -38.9516,
    lng: -68.0591,
  },
  {
    id: "dist-salta-1",
    name: "Pisos del NOA",
    city: "Salta",
    province: "Salta",
    phone: "+54 387 422-1100",
    address: "Av. Entre Ríos 450",
    lat: -24.7859,
    lng: -65.4116,
  },
];
