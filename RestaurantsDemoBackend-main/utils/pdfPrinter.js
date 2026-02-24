// utils/pdfPrinter.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const os = require("os");
const path = require("path");
const printer = require("pdf-to-printer");

/**
 * Create thermal KOT PDF for XP-80C (80mm) and print
 * @param {Array} products 
 * @param {string} orderType
 * @param {string} tableNo
 * @param {string} tokenNo
 */
async function createAndPrintPDF(products, orderType, tableNo, tokenNo) {
    return new Promise((resolve, reject) => {
        try {
            // Thermal paper width ~ 80mm → 225 points
            const doc = new PDFDocument({
                size: [225, 1000], // width 225pt, height arbitrary (auto-expand)
                margins: { top: 1, bottom: 2, left: 0, right: 2 }
            });

            const chunks = [];

            doc.on("data", chunk => chunks.push(chunk));
            doc.on("end", async () => {
                try {
                    const pdfBuffer = Buffer.concat(chunks);
                    console.log("🖨 PDF generated, size:", pdfBuffer.length, "bytes");

                    const tempPath = path.join(os.tmpdir(), `kot_${Date.now()}.pdf`);
                    fs.writeFileSync(tempPath, pdfBuffer);
                    console.log("💾 PDF saved temporarily at:", tempPath);

                    try {
                        console.log("📄 Sending PDF to printer XP-80C...");
                        await printer.print(tempPath, { printer: "XP-80C" });
                        console.log("✅ Print command sent to XP-80C");
                    } catch (printErr) {
                        console.error("❌ Error printing PDF:", printErr);
                        reject(printErr);
                        return;
                    }

                    fs.unlinkSync(tempPath);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });


            // Header
            doc.fontSize(12).text("Kitchen Order Ticket", { align: "center" });
            doc.moveDown(0.3);
            doc.fontSize(8).text(`Time: ${new Date().toLocaleString()}`, { align: "center" });
            doc.moveDown(0.3);
            doc.font('Helvetica-Bold')
                .fontSize(10)
                .text(orderType === "dinein" ? `Table: ${tableNo}` : `Token: ${tokenNo}`, { align: "center" });

            doc.moveDown(0.3);
            doc.moveTo(0, doc.y).lineTo(215, doc.y).stroke();
            doc.moveDown(0.3);

            // Column headers
            doc.fontSize(8)
                .text("Item", 4, doc.y, { width: 120, align: "left" })
                .text("Qty", 90, doc.y, { width: 40, align: "center" })
                .text("Subtotal", 150, doc.y, { width: 45, align: "right" });

            doc.moveDown(0.2);
            doc.moveTo(0, doc.y).lineTo(215, doc.y).stroke();
            doc.moveDown(0.3);

            // Items
            products.forEach(p => {
                doc.fontSize(8);
                const name = p.name.length > 32 ? p.name.substring(0, 32) + "…" : p.name;
                const variation = p.variation || ''
                doc.text(name + ' ' + variation, 4, doc.y, { width: 120 })
                    .text(p.quantity.toString(), 90, doc.y, { width: 40, align: "center" })
                    .text(p.subtotal.toString(), 150, doc.y, { width: 45, align: "right" });
                doc.moveDown(0.2);
            });

            doc.moveDown(0.5);
            doc.moveTo(0, doc.y).lineTo(215, doc.y).stroke();
            doc.moveDown(0.5);

            // Footer
            doc.fontSize(8).text("Wait for your order", 0, doc.y, { align: "center" });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { createAndPrintPDF };
