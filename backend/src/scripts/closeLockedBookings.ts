import "dotenv/config";
import { closeLockedBookingsAsPaid } from "../bookings.js";

const demoOnly = process.argv.includes("--all") ? false : true;
closeLockedBookingsAsPaid({ demoOnly })
  .then((result: { closed: number; ids: string[] }) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
