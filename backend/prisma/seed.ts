import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pitches = [
    { name: "Turf Ground", location: "Downtown Sports Arena", pricePerHour: 1800 },
    { name: "Box Cricket", location: "Sector 5 Activity Center", pricePerHour: 1400 },
    { name: "Indoor Nets", location: "City Indoor Complex", pricePerHour: 1000 }
  ];

  for (const pitch of pitches) {
    await prisma.pitch.upsert({
      where: { name: pitch.name },
      update: {
        location: pitch.location,
        pricePerHour: pitch.pricePerHour
      },
      create: {
        name: pitch.name,
        location: pitch.location,
        pricePerHour: pitch.pricePerHour
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    //@ts-ignore
    process.exit(1);
  });
