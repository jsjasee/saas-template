import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client"; // based on my schema.prisma 'output' field, it is in a generatated folder then prisma folder, unlike the docs which is prisma folder then inside has a generated folder

// we want to have 1 connection at a time, nextJS runs serverless (edge?) every req goes to the edge itself? there could be multiple edges at the same time querying the database? if there's a connection we just use that, we dont create more connections, if there is NONE then we create one? yes.
// singleton??

const prismaClientSingleTon = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter }); // this gives us a new instance of prisma
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
}; // umm what does this mean?

const prisma = globalForPrisma.prisma ?? prismaClientSingleTon(); // what is this ?? syntax in typescript?? like if globalForPrisma.prisma doesn't exist then we try to create a new PrismaClient()? yes.

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
