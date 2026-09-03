import "dotenv/config";
import express from "express";
import cors from "cors";
import { matchRouter } from "./routes/match.js";
import { bookRouter } from "./routes/book.js";
import { completeRouter } from "./routes/complete.js";
import { bookingsRouter } from "./routes/bookings.js";
import { payoutRouter } from "./routes/payout.js";
import { ratingsRouter } from "./routes/ratings.js";
import { guidesRouter } from "./routes/guides.js";
import { streamsRouter } from "./routes/streams.js";
import { walletRouter } from "./routes/wallet.js";
import { adminRouter } from "./routes/admin.js";
import { fxRouter } from "./routes/fx.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "guidemate-backend" }));

app.use("/api/match", matchRouter);
app.use("/api/book", bookRouter);
app.use("/api/complete", completeRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/payout", payoutRouter);
app.use("/api/ratings", ratingsRouter);
app.use("/api/guides", guidesRouter);
app.use("/api/streams", streamsRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/admin", adminRouter);
app.use("/api/fx", fxRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Guidemate backend listening on http://localhost:${port}`);
});
