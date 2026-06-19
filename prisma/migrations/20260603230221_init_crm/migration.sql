-- CreateEnum
CREATE TYPE "EstadoCrm" AS ENUM ('NUEVO', 'EN_CONTACTO', 'COMPRO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150),
    "telefono" VARCHAR(30) NOT NULL,
    "telefono_normalizado" VARCHAR(30) NOT NULL,
    "estado_crm" "EstadoCrm" NOT NULL DEFAULT 'NUEVO',
    "notas_internas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacciones_chat" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "url_origen" VARCHAR(512),
    "mensaje_inicial" TEXT,
    "user_agent" VARCHAR(255),
    "ip_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interacciones_chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_telefono_normalizado_key" ON "clientes"("telefono_normalizado");

-- CreateIndex
CREATE INDEX "clientes_estado_crm_idx" ON "clientes"("estado_crm");

-- CreateIndex
CREATE INDEX "clientes_created_at_idx" ON "clientes"("created_at");

-- CreateIndex
CREATE INDEX "interacciones_chat_cliente_id_idx" ON "interacciones_chat"("cliente_id");

-- CreateIndex
CREATE INDEX "interacciones_chat_created_at_idx" ON "interacciones_chat"("created_at");

-- AddForeignKey
ALTER TABLE "interacciones_chat" ADD CONSTRAINT "interacciones_chat_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
