require('dotenv').config({ path: '../backend/seven-iwallet-backend/.env' });
const { PrismaClient } = require('../backend/seven-iwallet-backend/node_modules/@prisma/client');
const prisma = new PrismaClient({ log: ['query', 'error'] });

async function run() {
  try {
    console.log("Testing Prisma cryptoTypeEnc filter...");
    const nullCount = await prisma.timeDeposit.count({
      where: { cryptoTypeEnc: null }
    });
    console.log("Null count:", nullCount);
    const notNullCount = await prisma.timeDeposit.count({
      where: { cryptoTypeEnc: { not: null } }
    });
    console.log("Not null count:", notNullCount);
  } catch(e) {
    console.error("FAILED:", e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
