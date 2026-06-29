require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { generateSignedUrl } = require("./config/r2");



const app = express();
const DOMAIN = process.env.DOMAIN_URL;
console.log("DOMAIN =", DOMAIN);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// SOLO assets pubblici
app.use("/assets", express.static("assets"));

/* CREA CHECKOUT */
app.post("/create-checkout-session", async (req, res) => {
  try {
    console.log("=== CREATE CHECKOUT ===");
console.log("DOMAIN:", DOMAIN);
    const { videoId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Video ${videoId}`,
            },
            unit_amount: 999,
          },
          quantity: 1,
        },
      ],

      metadata: {
        videoId: videoId,
      },
     

      success_url:
       `${DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
       `${DOMAIN}/index.html`,
    });

    res.json({ url: session.url });
} catch (err) {

  console.error("=== ERRORE STRIPE ===");
  console.error(err);

  res.status(500).json({
    error: err.message,
  });

}
  });


/* VERIFICA SESSIONE */
app.get("/verify-session", async (req, res) => {
  try {
    const { session_id } = req.query;

    const session =
      await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      return res.json({
        success: true,
        videoId: session.metadata.videoId,
      });
    }

    res.json({ success: false });
  } catch (err) {
    res.status(500).json({
      error: "Errore verifica pagamento",
    });
  }
});

/* SERVE VIDEO SOLO SE PAGATO */
app.get("/secure-video", async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(403).send("Access denied");
    }

    const session =
      await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.status(403).send("Payment required");
    }

    const videoId = session.metadata.videoId;
    const signedUrl = await generateSignedUrl(
  `full${videoId}.mp4`,
  7200
);

return res.redirect(signedUrl);

   /* const mp4Path = path.join(
  __dirname,
  "private_videos",
  `full${videoId}.mp4`
);

const movPath = path.join(
  __dirname,
  "private_videos",
  `full${videoId}.mov`
);

let filePath;

if (fs.existsSync(mp4Path)) {
  filePath = mp4Path;
}
else if (fs.existsSync(movPath)) {
  filePath = movPath;
}
else {
  return res.status(404).send("Video not found");
}

res.sendFile(filePath); 
*/

} catch (err) {

  console.error(err.message);
  res.status(500).send("Errore server");

}

});
/* CHECKOUT SUBSCRIPTION */
app.post("/create-subscription-checkout", async (req, res) => {

  try {

    const { plan } = req.body;

    let amount;
    let productName;

    if (plan === "monthly") {

      amount = 1499;
      productName = "1 Month Access";

    }

    else if (plan === "quarterly") {

      amount = 2499;
      productName = "3 Months Access";

    }

    else if (plan === "sixmonths") {

      amount = 3499;
      productName = "6 Months Access";

    }

    else {

      return res.status(400).json({
        error: "Invalid plan"
      });

    }

    const session = await stripe.checkout.sessions.create({

      payment_method_types: ["card"],

      mode: "payment",

      line_items: [
        {
          price_data: {

            currency: "eur",

            product_data: {
              name: productName
            },

            unit_amount: amount

          },

          quantity: 1

        }
      ],

      success_url:
        `${DOMAIN}/sub-success.html?plan=${plan}`,

      cancel_url:
        `${DOMAIN}/subscription.html`,

    });

    res.json({
      url: session.url
    });

  }

  catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }

});
/* VIDEO PER ABBONATI */
app.get("/subscription-video", (req, res) => {

  const { id } = req.query;

  const filePath = path.join(
    __dirname,
    "private_videos",
    `full${id}.mp4`
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Video not found");
  }

  res.sendFile(filePath);

});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});