/**
 * Seed script for the ERP database.
 *
 * Uses `pg` directly (not the Prisma Client) so it has no dependency on
 * downloading Prisma's query-engine binary — it only needs network
 * access to the Postgres instance itself. It relies on the same
 * fn_reserve_inventory / fn_dispatch_inventory functions the backend
 * will use, so the seed data is created the same way production data
 * would be.
 *
 * Run with: npm run seed
 */
require("dotenv").config();
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://erp_admin:erp_dev_password@127.0.0.1:5432/erp_manufacturing?schema=public";

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    // -----------------------------------------------------------------
    // Wipe existing data (idempotent seed, safe to re-run in dev)
    // -----------------------------------------------------------------
    await client.query(`
      TRUNCATE TABLE
        dispatch_items, dispatches,
        sales_order_items, sales_orders,
        quotation_items, quotations,
        enquiry_items, enquiries,
        inventory, products,
        customers, users
      RESTART IDENTITY CASCADE;
    `);

    // -----------------------------------------------------------------
    // USERS
    // -----------------------------------------------------------------
    const adminPasswordHash = await bcrypt.hash("Admin@12345", 10);
    const salesPasswordHash = await bcrypt.hash("Sales@12345", 10);

    const { rows: userRows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES
        ('System Administrator', 'admin@erpmfg.com', $1, 'ADMIN'),
        ('Riya Sharma', 'sales@erpmfg.com', $2, 'SALES_USER')
       RETURNING id, email, role`,
      [adminPasswordHash, salesPasswordHash]
    );
    const adminUser = userRows.find((u) => u.role === "ADMIN");
    const salesUser = userRows.find((u) => u.role === "SALES_USER");

    // -----------------------------------------------------------------
    // PRODUCTS
    // -----------------------------------------------------------------
    const products = [
      ["MS-PIPE-25", "MS Pipe 25mm NB Medium Class", "Piping", "Meter", 145.0],
      ["SS-SHEET-304-2MM", "Stainless Steel Sheet 304 - 2mm", "Sheets", "Sq. Meter", 2200.0],
      ["CI-VALVE-50", "Cast Iron Gate Valve 50mm PN16", "Valves", "Piece", 1850.0],
      ["HEX-BOLT-M12", "Hex Bolt M12 x 50mm Grade 8.8", "Fasteners", "Piece", 12.5],
      ["BRG-6205-ZZ", "Deep Groove Ball Bearing 6205-ZZ", "Bearings", "Piece", 320.0],
      ["CU-WIRE-2.5SQ", "Copper Wire 2.5 sq mm Single Core", "Electrical", "Meter", 68.0],
    ];

    const productIds = {};
    for (const [code, name, category, unit, price] of products) {
      const { rows } = await client.query(
        `INSERT INTO products (product_code, product_name, category, unit, base_price)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, product_code`,
        [code, name, category, unit, price]
      );
      productIds[code] = rows[0].id;
    }

    // -----------------------------------------------------------------
    // INVENTORY (one row per product, starting fully unreserved)
    // -----------------------------------------------------------------
    const openingStock = {
      "MS-PIPE-25": 5000,
      "SS-SHEET-304-2MM": 800,
      "CI-VALVE-50": 150,
      "HEX-BOLT-M12": 20000,
      "BRG-6205-ZZ": 600,
      "CU-WIRE-2.5SQ": 10000,
    };

    for (const [code, qty] of Object.entries(openingStock)) {
      await client.query(
        `INSERT INTO inventory (product_id, physical_quantity, reserved_quantity)
         VALUES ($1, $2, 0)`,
        [productIds[code], qty]
      );
    }

    // -----------------------------------------------------------------
    // CUSTOMERS
    // -----------------------------------------------------------------
    const customers = [
      ["ABC Engineering Pvt. Ltd.", "Anil Batra", "+91-9820011223", "purchase@abcengg.in", "Pune"],
      ["Bharat Industrial Supplies", "Meena Kulkarni", "+91-9833022334", "meena@bharatind.co.in", "Mumbai"],
      ["Vikram Fabricators", "Vikram Rathi", "+91-9911223344", "vikram@fabricators.in", "Ahmedabad"],
      ["Chennai Steel Traders", "S. Ramesh", "+91-9944556677", "ramesh@chennaisteel.in", "Chennai"],
    ];

    const customerIds = {};
    for (const [companyName, contact, mobile, email, city] of customers) {
      const { rows } = await client.query(
        `INSERT INTO customers (company_name, contact_person, mobile, email, city)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, company_name`,
        [companyName, contact, mobile, email, city]
      );
      customerIds[companyName] = rows[0].id;
    }

    // -----------------------------------------------------------------
    // SAMPLE WORKFLOW #1 — full chain: Enquiry -> Quotation -> Sales
    // Order -> Dispatch (partial), demonstrating the entire traceable
    // path and exercising fn_reserve_inventory / fn_dispatch_inventory.
    // -----------------------------------------------------------------
    const abcId = customerIds["ABC Engineering Pvt. Ltd."];

    const { rows: enq1Rows } = await client.query(
      `INSERT INTO enquiries (enquiry_number, customer_id, enquiry_date, required_date, status, notes, created_by)
       VALUES ('ENQ-2026-0001', $1, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'WON', 'Bulk order for a new plant expansion', $2)
       RETURNING id`,
      [abcId, salesUser.id]
    );
    const enq1Id = enq1Rows[0].id;

    const enq1Items = [
      ["MS-PIPE-25", 100],
      ["SS-SHEET-304-2MM", 40],
      ["CI-VALVE-50", 5],
    ];
    for (const [code, qty] of enq1Items) {
      await client.query(
        `INSERT INTO enquiry_items (enquiry_id, product_id, quantity) VALUES ($1, $2, $3)`,
        [enq1Id, productIds[code], qty]
      );
    }

    // Quotation for enquiry #1 — accepted by the customer.
    // Line amounts: base = qty * unit_price; discount then GST applied.
    // (Backend is expected to recompute/validate these; seed mirrors
    // the same formula for consistency.)
    function computeLine(qty, unitPrice, discountPct, gstPct) {
      const base = qty * unitPrice;
      const afterDiscount = base * (1 - discountPct / 100);
      const afterGst = afterDiscount * (1 + gstPct / 100);
      return Math.round(afterGst * 100) / 100;
    }

    const qtn1Lines = [
      { code: "MS-PIPE-25", qty: 100, unitPrice: 145.0, discount: 5, gst: 18 },
      { code: "SS-SHEET-304-2MM", qty: 40, unitPrice: 2200.0, discount: 3, gst: 18 },
      { code: "CI-VALVE-50", qty: 5, unitPrice: 1850.0, discount: 0, gst: 18 },
    ];
    const qtn1Total = qtn1Lines.reduce(
      (sum, l) => sum + computeLine(l.qty, l.unitPrice, l.discount, l.gst),
      0
    );

    const { rows: qtn1Rows } = await client.query(
      `INSERT INTO quotations (quotation_number, enquiry_id, customer_id, valid_until, status, grand_total, created_by)
       VALUES ('QTN-2026-0001', $1, $2, CURRENT_DATE + INTERVAL '15 days', 'ACCEPTED', $3, $4)
       RETURNING id`,
      [enq1Id, abcId, qtn1Total.toFixed(2), salesUser.id]
    );
    const qtn1Id = qtn1Rows[0].id;

    for (const l of qtn1Lines) {
      const lineAmount = computeLine(l.qty, l.unitPrice, l.discount, l.gst);
      await client.query(
        `INSERT INTO quotation_items
           (quotation_id, product_id, quantity, unit_price, discount_percentage, gst_percentage, line_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [qtn1Id, productIds[l.code], l.qty, l.unitPrice, l.discount, l.gst, lineAmount.toFixed(2)]
      );
    }

    // Sales Order created from the ACCEPTED quotation (trigger allows this).
    const { rows: so1Rows } = await client.query(
      `INSERT INTO sales_orders (order_number, quotation_id, customer_id, total_amount, status, created_by)
       VALUES ('SO-2026-0001', $1, $2, $3, 'CONFIRMED', $4)
       RETURNING id`,
      [qtn1Id, abcId, qtn1Total.toFixed(2), adminUser.id]
    );
    const so1Id = so1Rows[0].id;

    for (const l of qtn1Lines) {
      const lineAmount = computeLine(l.qty, l.unitPrice, l.discount, l.gst);
      await client.query(
        `INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, line_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [so1Id, productIds[l.code], l.qty, l.unitPrice, lineAmount.toFixed(2)]
      );
      // Confirming the order reserves stock (reserved_quantity increases,
      // physical_quantity is untouched) via the safe DB function.
      await client.query(`SELECT fn_reserve_inventory($1, $2)`, [productIds[l.code], l.qty]);
    }

    // Partial dispatch of the pipe and valves (not the full order — the
    // sheet stays reserved, demonstrating a Sales Order can be
    // dispatched in more than one shipment).
    const { rows: dsp1Rows } = await client.query(
      `INSERT INTO dispatches (dispatch_number, sales_order_id, vehicle_number, driver_name, created_by)
       VALUES ('DSP-2026-0001', $1, 'MH-12-AB-4321', 'Suresh Pawar', $2)
       RETURNING id`,
      [so1Id, adminUser.id]
    );
    const dsp1Id = dsp1Rows[0].id;

    const dsp1Items = [
      ["MS-PIPE-25", 100],
      ["CI-VALVE-50", 5],
    ];
    for (const [code, qty] of dsp1Items) {
      await client.query(
        `INSERT INTO dispatch_items (dispatch_id, product_id, quantity) VALUES ($1, $2, $3)`,
        [dsp1Id, productIds[code], qty]
      );
      await client.query(`SELECT fn_dispatch_inventory($1, $2)`, [productIds[code], qty]);
    }

    // -----------------------------------------------------------------
    // SAMPLE WORKFLOW #2 — earlier stage, for status variety:
    // an enquiry that has been quoted but not yet accepted.
    // -----------------------------------------------------------------
    const bharatId = customerIds["Bharat Industrial Supplies"];

    const { rows: enq2Rows } = await client.query(
      `INSERT INTO enquiries (enquiry_number, customer_id, required_date, status, notes, created_by)
       VALUES ('ENQ-2026-0002', $1, CURRENT_DATE + INTERVAL '30 days', 'QUOTED', 'Awaiting customer confirmation', $2)
       RETURNING id`,
      [bharatId, salesUser.id]
    );
    const enq2Id = enq2Rows[0].id;

    await client.query(
      `INSERT INTO enquiry_items (enquiry_id, product_id, quantity) VALUES ($1, $2, $3), ($1, $4, $5)`,
      [enq2Id, productIds["HEX-BOLT-M12"], 2000, productIds["BRG-6205-ZZ"], 50]
    );

    const qtn2Lines = [
      { code: "HEX-BOLT-M12", qty: 2000, unitPrice: 12.5, discount: 2, gst: 18 },
      { code: "BRG-6205-ZZ", qty: 50, unitPrice: 320.0, discount: 0, gst: 18 },
    ];
    const qtn2Total = qtn2Lines.reduce(
      (sum, l) => sum + computeLine(l.qty, l.unitPrice, l.discount, l.gst),
      0
    );

    const { rows: qtn2Rows } = await client.query(
      `INSERT INTO quotations (quotation_number, enquiry_id, customer_id, valid_until, status, grand_total, created_by)
       VALUES ('QTN-2026-0002', $1, $2, CURRENT_DATE + INTERVAL '10 days', 'SENT', $3, $4)
       RETURNING id`,
      [enq2Id, bharatId, qtn2Total.toFixed(2), salesUser.id]
    );
    const qtn2Id = qtn2Rows[0].id;

    for (const l of qtn2Lines) {
      const lineAmount = computeLine(l.qty, l.unitPrice, l.discount, l.gst);
      await client.query(
        `INSERT INTO quotation_items
           (quotation_id, product_id, quantity, unit_price, discount_percentage, gst_percentage, line_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [qtn2Id, productIds[l.code], l.qty, l.unitPrice, l.discount, l.gst, lineAmount.toFixed(2)]
      );
    }
    // Note: no Sales Order for this one on purpose — status is SENT,
    // so the trg_check_quotation_accepted trigger would (correctly) reject it.

    // -----------------------------------------------------------------
    // SAMPLE WORKFLOW #3 — a brand-new, un-quoted enquiry.
    // -----------------------------------------------------------------
    const vikramId = customerIds["Vikram Fabricators"];
    const { rows: enq3Rows } = await client.query(
      `INSERT INTO enquiries (enquiry_number, customer_id, required_date, status, notes, created_by)
       VALUES ('ENQ-2026-0003', $1, CURRENT_DATE + INTERVAL '45 days', 'NEW', 'Customer requested a call back', $2)
       RETURNING id`,
      [vikramId, salesUser.id]
    );
    await client.query(
      `INSERT INTO enquiry_items (enquiry_id, product_id, quantity) VALUES ($1, $2, $3)`,
      [enq3Rows[0].id, productIds["CU-WIRE-2.5SQ"], 3000]
    );

    await client.query("COMMIT");

    console.log("Seed completed successfully.");
    console.log("");
    console.log("Test credentials:");
    console.log("  ADMIN       admin@erpmfg.com / Admin@12345");
    console.log("  SALES_USER  sales@erpmfg.com / Sales@12345");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed, transaction rolled back.");
    console.error(err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
