-- =====================================================================
-- ERP Database — Initial Migration
-- Manufacturing & Supply Company
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------

CREATE TYPE "Role" AS ENUM ('ADMIN', 'SALES_USER');
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'QUOTED', 'WON', 'LOST');
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');
CREATE TYPE "SalesOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPATCHED', 'CANCELLED');

-- ---------------------------------------------------------------------
-- 1. USERS
-- ---------------------------------------------------------------------

CREATE TABLE "users" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "full_name"     TEXT NOT NULL,
    "email"         TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role"          "Role" NOT NULL,
    "is_active"     BOOLEAN NOT NULL DEFAULT true,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "users_email_key" UNIQUE ("email"),
    CONSTRAINT "users_email_format_check" CHECK ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX "users_role_idx" ON "users" ("role");

-- ---------------------------------------------------------------------
-- 2. CUSTOMERS
-- ---------------------------------------------------------------------

CREATE TABLE "customers" (
    "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_name"   TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "mobile"         TEXT NOT NULL,
    "email"          TEXT,
    "city"           TEXT,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "customers_mobile_key" UNIQUE ("mobile"),
    CONSTRAINT "customers_mobile_format_check" CHECK ("mobile" ~ '^[0-9+][0-9+ -]{6,14}$')
);

CREATE INDEX "customers_company_name_idx" ON "customers" ("company_name");
CREATE INDEX "customers_city_idx" ON "customers" ("city");

-- ---------------------------------------------------------------------
-- 3. PRODUCTS
-- ---------------------------------------------------------------------

CREATE TABLE "products" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "category"     TEXT NOT NULL,
    "unit"         TEXT NOT NULL,
    "base_price"   NUMERIC(12,2) NOT NULL,
    "is_active"    BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "products_product_code_key" UNIQUE ("product_code"),
    CONSTRAINT "products_base_price_nonnegative_check" CHECK ("base_price" >= 0)
);

CREATE INDEX "products_category_idx" ON "products" ("category");

-- ---------------------------------------------------------------------
-- 4. INVENTORY
-- ---------------------------------------------------------------------
-- available_quantity is intentionally NOT a stored column: it is always
-- (physical_quantity - reserved_quantity), exposed via the view below.
-- The CHECK constraints are the last line of defense that make an
-- inconsistent row impossible to commit, no matter what the backend does.

CREATE TABLE "inventory" (
    "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id"        UUID NOT NULL,
    "physical_quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "inventory_product_id_key" UNIQUE ("product_id"),
    CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id")
        REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_physical_nonnegative_check" CHECK ("physical_quantity" >= 0),
    CONSTRAINT "inventory_reserved_nonnegative_check" CHECK ("reserved_quantity" >= 0),
    CONSTRAINT "inventory_reserved_not_exceed_physical_check" CHECK ("reserved_quantity" <= "physical_quantity")
);

-- Convenience read view exposing the derived available_quantity.
CREATE VIEW "inventory_with_availability" AS
SELECT
    i.*,
    (i."physical_quantity" - i."reserved_quantity") AS "available_quantity"
FROM "inventory" i;

-- ---------------------------------------------------------------------
-- 5. CUSTOMER ENQUIRIES
-- ---------------------------------------------------------------------

CREATE TABLE "enquiries" (
    "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "enquiry_number" TEXT NOT NULL,
    "customer_id"    UUID NOT NULL,
    "enquiry_date"   DATE NOT NULL DEFAULT CURRENT_DATE,
    "required_date"  DATE,
    "status"         "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "notes"          TEXT,
    "created_by"     UUID NOT NULL,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "enquiries_enquiry_number_key" UNIQUE ("enquiry_number"),
    CONSTRAINT "enquiries_customer_id_fkey" FOREIGN KEY ("customer_id")
        REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "enquiries_created_by_fkey" FOREIGN KEY ("created_by")
        REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "enquiries_required_date_check" CHECK ("required_date" IS NULL OR "required_date" >= "enquiry_date")
);

CREATE INDEX "enquiries_customer_id_idx" ON "enquiries" ("customer_id");
CREATE INDEX "enquiries_status_idx" ON "enquiries" ("status");

CREATE TABLE "enquiry_items" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "enquiry_id"  UUID NOT NULL,
    "product_id"  UUID NOT NULL,
    "quantity"    INTEGER NOT NULL,

    CONSTRAINT "enquiry_items_enquiry_id_fkey" FOREIGN KEY ("enquiry_id")
        REFERENCES "enquiries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "enquiry_items_product_id_fkey" FOREIGN KEY ("product_id")
        REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "enquiry_items_quantity_positive_check" CHECK ("quantity" > 0),
    CONSTRAINT "enquiry_items_unique_product_per_enquiry" UNIQUE ("enquiry_id", "product_id")
);

CREATE INDEX "enquiry_items_enquiry_id_idx" ON "enquiry_items" ("enquiry_id");
CREATE INDEX "enquiry_items_product_id_idx" ON "enquiry_items" ("product_id");

-- ---------------------------------------------------------------------
-- 6. QUOTATIONS
-- ---------------------------------------------------------------------

CREATE TABLE "quotations" (
    "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "quotation_number" TEXT NOT NULL,
    "enquiry_id"       UUID NOT NULL,
    "customer_id"      UUID NOT NULL,
    "valid_until"      DATE NOT NULL,
    "status"           "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "grand_total"      NUMERIC(14,2) NOT NULL DEFAULT 0,
    "created_by"       UUID NOT NULL,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "quotations_quotation_number_key" UNIQUE ("quotation_number"),
    CONSTRAINT "quotations_enquiry_id_fkey" FOREIGN KEY ("enquiry_id")
        REFERENCES "enquiries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id")
        REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotations_created_by_fkey" FOREIGN KEY ("created_by")
        REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotations_grand_total_nonnegative_check" CHECK ("grand_total" >= 0)
);

CREATE INDEX "quotations_enquiry_id_idx" ON "quotations" ("enquiry_id");
CREATE INDEX "quotations_customer_id_idx" ON "quotations" ("customer_id");
CREATE INDEX "quotations_status_idx" ON "quotations" ("status");

CREATE TABLE "quotation_items" (
    "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "quotation_id"        UUID NOT NULL,
    "product_id"          UUID NOT NULL,
    "quantity"            INTEGER NOT NULL,
    "unit_price"          NUMERIC(12,2) NOT NULL,
    "discount_percentage" NUMERIC(5,2) NOT NULL DEFAULT 0,
    "gst_percentage"      NUMERIC(5,2) NOT NULL DEFAULT 0,
    "line_amount"         NUMERIC(14,2) NOT NULL,

    CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id")
        REFERENCES "quotations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quotation_items_product_id_fkey" FOREIGN KEY ("product_id")
        REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotation_items_quantity_positive_check" CHECK ("quantity" > 0),
    CONSTRAINT "quotation_items_unit_price_nonnegative_check" CHECK ("unit_price" >= 0),
    CONSTRAINT "quotation_items_discount_range_check" CHECK ("discount_percentage" BETWEEN 0 AND 100),
    CONSTRAINT "quotation_items_gst_range_check" CHECK ("gst_percentage" BETWEEN 0 AND 100),
    CONSTRAINT "quotation_items_line_amount_nonnegative_check" CHECK ("line_amount" >= 0),
    CONSTRAINT "quotation_items_unique_product_per_quotation" UNIQUE ("quotation_id", "product_id")
);

CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items" ("quotation_id");
CREATE INDEX "quotation_items_product_id_idx" ON "quotation_items" ("product_id");

-- ---------------------------------------------------------------------
-- 7. SALES ORDERS
-- ---------------------------------------------------------------------
-- quotation_id is UNIQUE => a quotation can produce at most one Sales
-- Order, enforced by the database itself, not just application code.

CREATE TABLE "sales_orders" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_number" TEXT NOT NULL,
    "quotation_id" UUID NOT NULL,
    "customer_id"  UUID NOT NULL,
    "order_date"   DATE NOT NULL DEFAULT CURRENT_DATE,
    "total_amount" NUMERIC(14,2) NOT NULL,
    "status"       "SalesOrderStatus" NOT NULL DEFAULT 'PENDING',
    "created_by"   UUID NOT NULL,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "sales_orders_order_number_key" UNIQUE ("order_number"),
    CONSTRAINT "sales_orders_quotation_id_key" UNIQUE ("quotation_id"),
    CONSTRAINT "sales_orders_quotation_id_fkey" FOREIGN KEY ("quotation_id")
        REFERENCES "quotations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id")
        REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_orders_created_by_fkey" FOREIGN KEY ("created_by")
        REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_orders_total_amount_nonnegative_check" CHECK ("total_amount" >= 0)
);

CREATE INDEX "sales_orders_customer_id_idx" ON "sales_orders" ("customer_id");
CREATE INDEX "sales_orders_status_idx" ON "sales_orders" ("status");

CREATE TABLE "sales_order_items" (
    "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sales_order_id" UUID NOT NULL,
    "product_id"     UUID NOT NULL,
    "quantity"       INTEGER NOT NULL,
    "unit_price"     NUMERIC(12,2) NOT NULL,
    "line_amount"    NUMERIC(14,2) NOT NULL,

    CONSTRAINT "sales_order_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id")
        REFERENCES "sales_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sales_order_items_product_id_fkey" FOREIGN KEY ("product_id")
        REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_order_items_quantity_positive_check" CHECK ("quantity" > 0),
    CONSTRAINT "sales_order_items_unit_price_nonnegative_check" CHECK ("unit_price" >= 0),
    CONSTRAINT "sales_order_items_line_amount_nonnegative_check" CHECK ("line_amount" >= 0),
    CONSTRAINT "sales_order_items_unique_product_per_order" UNIQUE ("sales_order_id", "product_id")
);

CREATE INDEX "sales_order_items_sales_order_id_idx" ON "sales_order_items" ("sales_order_id");
CREATE INDEX "sales_order_items_product_id_idx" ON "sales_order_items" ("product_id");

-- ---------------------------------------------------------------------
-- 9. DISPATCH
-- ---------------------------------------------------------------------

CREATE TABLE "dispatches" (
    "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "dispatch_number" TEXT NOT NULL,
    "sales_order_id"  UUID NOT NULL,
    "dispatch_date"   DATE NOT NULL DEFAULT CURRENT_DATE,
    "vehicle_number"  TEXT NOT NULL,
    "driver_name"     TEXT NOT NULL,
    "created_by"      UUID NOT NULL,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "dispatches_dispatch_number_key" UNIQUE ("dispatch_number"),
    CONSTRAINT "dispatches_sales_order_id_fkey" FOREIGN KEY ("sales_order_id")
        REFERENCES "sales_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dispatches_created_by_fkey" FOREIGN KEY ("created_by")
        REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "dispatches_sales_order_id_idx" ON "dispatches" ("sales_order_id");

CREATE TABLE "dispatch_items" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "dispatch_id"  UUID NOT NULL,
    "product_id"   UUID NOT NULL,
    "quantity"     INTEGER NOT NULL,

    CONSTRAINT "dispatch_items_dispatch_id_fkey" FOREIGN KEY ("dispatch_id")
        REFERENCES "dispatches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dispatch_items_product_id_fkey" FOREIGN KEY ("product_id")
        REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dispatch_items_quantity_positive_check" CHECK ("quantity" > 0),
    CONSTRAINT "dispatch_items_unique_product_per_dispatch" UNIQUE ("dispatch_id", "product_id")
);

CREATE INDEX "dispatch_items_dispatch_id_idx" ON "dispatch_items" ("dispatch_id");
CREATE INDEX "dispatch_items_product_id_idx" ON "dispatch_items" ("product_id");

-- =====================================================================
-- BUSINESS-RULE TRIGGERS
-- =====================================================================

-- Rule: a Sales Order can only be created from an ACCEPTED quotation.
-- (DRAFT and REJECTED quotations are blocked at the database level,
-- not merely by application code.)
CREATE OR REPLACE FUNCTION "trg_fn_check_quotation_accepted"()
RETURNS TRIGGER AS $$
DECLARE
    v_status "QuotationStatus";
BEGIN
    SELECT "status" INTO v_status FROM "quotations" WHERE "id" = NEW."quotation_id" FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Quotation % does not exist', NEW."quotation_id";
    END IF;

    IF v_status <> 'ACCEPTED' THEN
        RAISE EXCEPTION 'Cannot create a Sales Order from quotation % because its status is % (must be ACCEPTED)',
            NEW."quotation_id", v_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_check_quotation_accepted"
BEFORE INSERT ON "sales_orders"
FOR EACH ROW EXECUTE FUNCTION "trg_fn_check_quotation_accepted"();

-- Rule: dispatch items cannot be created against a CANCELLED sales order.
CREATE OR REPLACE FUNCTION "trg_fn_check_sales_order_dispatchable"()
RETURNS TRIGGER AS $$
DECLARE
    v_status "SalesOrderStatus";
BEGIN
    SELECT "status" INTO v_status FROM "sales_orders" WHERE "id" = NEW."sales_order_id" FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Sales order % does not exist', NEW."sales_order_id";
    END IF;

    IF v_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Cannot dispatch sales order % because it is CANCELLED', NEW."sales_order_id";
    END IF;

    IF v_status = 'PENDING' THEN
        RAISE EXCEPTION 'Cannot dispatch sales order % because it has not been CONFIRMED yet', NEW."sales_order_id";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_check_sales_order_dispatchable"
BEFORE INSERT ON "dispatches"
FOR EACH ROW EXECUTE FUNCTION "trg_fn_check_sales_order_dispatchable"();

-- Generic updated_at maintenance trigger, applied to every table that has
-- an updated_at column (kept here instead of relying on the ORM layer,
-- so it holds even for raw SQL/manual writes).
CREATE OR REPLACE FUNCTION "trg_fn_set_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updated_at" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "set_updated_at_users" BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION "trg_fn_set_updated_at"();
CREATE TRIGGER "set_updated_at_customers" BEFORE UPDATE ON "customers" FOR EACH ROW EXECUTE FUNCTION "trg_fn_set_updated_at"();
CREATE TRIGGER "set_updated_at_products" BEFORE UPDATE ON "products" FOR EACH ROW EXECUTE FUNCTION "trg_fn_set_updated_at"();
CREATE TRIGGER "set_updated_at_inventory" BEFORE UPDATE ON "inventory" FOR EACH ROW EXECUTE FUNCTION "trg_fn_set_updated_at"();
CREATE TRIGGER "set_updated_at_enquiries" BEFORE UPDATE ON "enquiries" FOR EACH ROW EXECUTE FUNCTION "trg_fn_set_updated_at"();
CREATE TRIGGER "set_updated_at_quotations" BEFORE UPDATE ON "quotations" FOR EACH ROW EXECUTE FUNCTION "trg_fn_set_updated_at"();
CREATE TRIGGER "set_updated_at_sales_orders" BEFORE UPDATE ON "sales_orders" FOR EACH ROW EXECUTE FUNCTION "trg_fn_set_updated_at"();

-- =====================================================================
-- CONCURRENCY-SAFE INVENTORY FUNCTIONS
-- =====================================================================
-- These wrap the exact pattern the backend must use inside a
-- transaction: lock the inventory row (SELECT ... FOR UPDATE), verify
-- the invariant, then update. Two concurrent callers reserving against
-- the same product will be serialized by Postgres's row lock, so the
-- second caller always sees the first caller's committed change before
-- its own check runs — it is impossible for both to succeed when only
-- one has enough stock. Calling these functions is optional (the
-- backend may instead run the equivalent SQL directly inside its own
-- transaction) but they are the recommended, tested entry point.

-- Reserve stock for a product (called when an ADMIN confirms a Sales Order).
CREATE OR REPLACE FUNCTION "fn_reserve_inventory"(
    p_product_id UUID,
    p_quantity   INTEGER
) RETURNS VOID AS $$
DECLARE
    v_physical INTEGER;
    v_reserved INTEGER;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Reservation quantity must be positive (got %)', p_quantity;
    END IF;

    -- Row lock: any concurrent transaction touching this same inventory
    -- row (reserve, release, or dispatch) blocks here until this
    -- transaction commits or rolls back.
    SELECT "physical_quantity", "reserved_quantity"
    INTO v_physical, v_reserved
    FROM "inventory"
    WHERE "product_id" = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No inventory row for product %', p_product_id;
    END IF;

    IF (v_physical - v_reserved) < p_quantity THEN
        RAISE EXCEPTION 'Insufficient available stock for product %: available %, requested %',
            p_product_id, (v_physical - v_reserved), p_quantity;
    END IF;

    UPDATE "inventory"
    SET "reserved_quantity" = "reserved_quantity" + p_quantity
    WHERE "product_id" = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Release a previously made reservation (e.g. Sales Order cancelled
-- before dispatch). Reserved decreases; physical is untouched.
CREATE OR REPLACE FUNCTION "fn_release_inventory"(
    p_product_id UUID,
    p_quantity   INTEGER
) RETURNS VOID AS $$
DECLARE
    v_reserved INTEGER;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Release quantity must be positive (got %)', p_quantity;
    END IF;

    SELECT "reserved_quantity" INTO v_reserved
    FROM "inventory"
    WHERE "product_id" = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No inventory row for product %', p_product_id;
    END IF;

    IF v_reserved < p_quantity THEN
        RAISE EXCEPTION 'Cannot release % units for product %: only % are reserved',
            p_quantity, p_product_id, v_reserved;
    END IF;

    UPDATE "inventory"
    SET "reserved_quantity" = "reserved_quantity" - p_quantity
    WHERE "product_id" = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Dispatch stock: physical and reserved both decrease by the same amount.
CREATE OR REPLACE FUNCTION "fn_dispatch_inventory"(
    p_product_id UUID,
    p_quantity   INTEGER
) RETURNS VOID AS $$
DECLARE
    v_physical INTEGER;
    v_reserved INTEGER;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Dispatch quantity must be positive (got %)', p_quantity;
    END IF;

    SELECT "physical_quantity", "reserved_quantity"
    INTO v_physical, v_reserved
    FROM "inventory"
    WHERE "product_id" = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No inventory row for product %', p_product_id;
    END IF;

    IF v_reserved < p_quantity THEN
        RAISE EXCEPTION 'Cannot dispatch % units for product %: only % are reserved',
            p_quantity, p_product_id, v_reserved;
    END IF;

    UPDATE "inventory"
    SET "physical_quantity" = "physical_quantity" - p_quantity,
        "reserved_quantity" = "reserved_quantity" - p_quantity
    WHERE "product_id" = p_product_id;
END;
$$ LANGUAGE plpgsql;
