import { PrismaClient } from "@prisma/client";


const prismaClientSingltion = () => {
    return new PrismaClient()
}

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient
}

type prismaClientSingltion = ReturnType<typeof prismaClientSingltion>

const primsa = globalForPrisma.prisma ?? prismaClientSingltion()

export default primsa

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = primsa
}