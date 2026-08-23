/**
 * Muselio Backend Server
 * Gère les paiements (Stripe) et les emails (Nodemailer)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuration Email (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'muselio.noreply@gmail.com',
    pass: process.env.EMAIL_PASS || 'app-password-here'
  }
});

// Configuration Stripe (sera utilisé côté frontend avec Stripe.js)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

// ============================================
// ROUTES
// ============================================

/**
 * 1. POST /api/contact
 * Traite le formulaire de contact
 */
app.post('/api/contact', async (req, res) => {
  try {
    const { email, message } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: 'Email et message requis' });
    }

    // Envoyer email à Muselio
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'museliomuselio23@gmail.com',
      subject: `Nouveau message de contact de ${email}`,
      html: `
        <h2>Nouveau Message de Contact</h2>
        <p><strong>De:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    });

    // Envoyer confirmation à l'utilisateur
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Merci pour votre message - Muselio',
      html: `
        <h2>Merci pour votre message!</h2>
        <p>Nous avons reçu votre message et vous répondrons dès que possible.</p>
        <p>Cordialement,<br>L'équipe Muselio</p>
      `
    });

    res.json({ success: true, message: 'Message envoyé avec succès!' });

  } catch (error) {
    console.error('Erreur contact:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

/**
 * 2. POST /api/payment
 * Crée une session Stripe Checkout
 */
app.post('/api/payment', async (req, res) => {
  try {
    const { plan, email } = req.body;

    const plans = {
      student: {
        name: 'Web Étudiant',
        price: 1000, // 10€ en cents
        description: 'Accès complet - Étudiant'
      },
      premium: {
        name: 'Web Premium',
        price: 2000, // 20€ en cents
        description: 'Accès complet avec collections et support'
      },
      professional: {
        name: 'Professionnel',
        price: 3000, // 30€ en cents
        description: 'Accès complet + batch download + support 24/7'
      }
    };

    if (!plans[plan]) {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    const selectedPlan = plans[plan];

    // Créer session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: selectedPlan.name,
            description: selectedPlan.description,
            images: ['https://keen-cranachan-275345.netlify.app/logo.png'],
          },
          unit_amount: selectedPlan.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      success_url: `https://keen-cranachan-275345.netlify.app/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: 'https://keen-cranachan-275345.netlify.app/payment-cancelled',
      billing_address_collection: 'auto',
    });

    res.json({ sessionId: session.id, sessionUrl: session.url });

  } catch (error) {
    console.error('Erreur paiement:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la session paiement' });
  }
});

/**
 * 3. POST /api/download
 * Envoie le lien de téléchargement HD
 */
app.post('/api/download', async (req, res) => {
  try {
    const { artworkId, email } = req.body;

    if (!artworkId || !email) {
      return res.status(400).json({ error: 'Paramètres requis manquants' });
    }

    // En production: générer lien S3 temporaire ou servir le fichier
    // Pour MVP: envoyer email avec lien public
    const downloadUrl = `https://keen-cranachan-275345.netlify.app/download/${artworkId}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Votre téléchargement Muselio est prêt',
      html: `
        <h2>Téléchargement Haute Définition</h2>
        <p>Votre œuvre est prête à être téléchargée:</p>
        <p><a href="${downloadUrl}" style="background: #d4af37; color: #1a1a1a; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Télécharger l'image HD</a></p>
        <p>Ce lien sera actif pendant 7 jours.</p>
      `
    });

    res.json({ success: true, message: 'Lien de téléchargement envoyé par email!' });

  } catch (error) {
    console.error('Erreur download:', error);
    res.status(500).json({ error: 'Erreur lors du traitement du téléchargement' });
  }
});

/**
 * 4. GET /api/artworks
 * Retourne la galerie d'œuvres
 */
app.get('/api/artworks', (req, res) => {
  const fs = require('fs');
  try {
    const data = fs.readFileSync(`${__dirname}/gallery-data.json`, 'utf-8');
    const artworks = JSON.parse(data);
    res.json(artworks);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des œuvres' });
  }
});

/**
 * 5. Health Check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Muselio Backend running on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.EMAIL_USER || 'Gmail SMTP'}`);
  console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}`);
});

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});
