const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
const { Resend } = require('resend')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

const ODOO_URL = process.env.ODOO_URL
const ODOO_DB = process.env.ODOO_DB
const ODOO_USER = process.env.ODOO_USER
const ODOO_PASSWORD = process.env.ODOO_PASSWORD
const resend = new Resend(process.env.RESEND_API_KEY)

async function getUID() {
  const response = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { db: ODOO_DB, login: ODOO_USER, password: ODOO_PASSWORD }
    })
  })
  const data = await response.json()
  return data.result?.uid
}

app.get('/api/test', async (req, res) => {
  const uid = await getUID()
  if (uid) {
    res.json({ success: true, uid })
  } else {
    res.status(401).json({ success: false })
  }
})

app.get('/api/contacts', async (req, res) => {
  const uid = await getUID()
  if (!uid) return res.status(401).json({ error: 'Auth failed' })
  const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'res.partner',
        method: 'search_read',
        args: [[]],
        kwargs: { fields: ['name', 'email', 'phone', 'street', 'city', 'customer_rank'], limit: 50 }
      }
    })
  })
  const data = await response.json()
  res.json(data.result || [])
})

app.get('/api/clients', async (req, res) => {
  const uid = await getUID()
  if (!uid) return res.status(401).json({ error: 'Auth failed' })
  const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'res.partner',
        method: 'search_read',
        args: [[['customer_rank', '>', 0]]],
        kwargs: { fields: ['name', 'email', 'phone', 'street', 'city'], limit: 50 }
      }
    })
  })
  const data = await response.json()
  res.json(data.result || [])
})

app.get('/api/produits', async (req, res) => {
  const uid = await getUID()
  if (!uid) return res.status(401).json({ error: 'Auth failed' })
  const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'product.product',
        method: 'search_read',
        args: [[]],
        kwargs: { fields: ['name', 'list_price', 'categ_id', 'qty_available'], limit: 100 }
      }
    })
  })
  const data = await response.json()
  res.json(data.result || [])
})

app.get('/api/rdvs', async (req, res) => {
  const uid = await getUID()
  if (!uid) return res.status(401).json({ error: 'Auth failed' })
  const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'calendar.event',
        method: 'search_read',
        args: [[]],
        kwargs: { fields: ['name', 'start', 'stop', 'partner_ids', 'location', 'description'], limit: 100 }
      }
    })
  })
  const data = await response.json()
  res.json(data.result || [])
})

app.get('/api/pistes', async (req, res) => {
  const uid = await getUID()
  if (!uid) return res.status(401).json({ error: 'Auth failed' })
  const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'crm.lead',
        method: 'search_read',
        args: [[]],
        kwargs: { fields: ['name', 'partner_name', 'email_from', 'phone', 'street', 'city', 'description', 'create_date', 'stage_id'], limit: 100 }
      }
    })
  })
  const data = await response.json()
  res.json(data.result || [])
})

app.get('/api/metriques', async (req, res) => {
  const uid = await getUID()
  if (!uid) return res.status(401).json({ error: 'Auth failed' })

  const maintenant = new Date()
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString()
  const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0).toISOString()

  const responseRdvs = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'calendar.event',
        method: 'search_read',
        args: [[['start', '>=', debutMois], ['start', '<=', finMois]]],
        kwargs: { fields: ['name', 'start', 'stop', 'location'], limit: 100 }
      }
    })
  })
  const dataRdvs = await responseRdvs.json()
  const rdvs = dataRdvs.result || []

  const responseCRM = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'crm.lead',
        method: 'search_read',
        args: [[['stage_id.name', '=', 'New']]],
        kwargs: { fields: ['name', 'partner_name', 'create_date'], limit: 50 }
      }
    })
  })
  const dataCRM = await responseCRM.json()
  const pistes = dataCRM.result || []

  res.json({
    rdvsMois: rdvs.length,
    demandesEnAttente: pistes.length,
    rdvs: rdvs.slice(0, 5),
    pistes: pistes.slice(0, 3),
  })
})

app.post('/api/seance', async (req, res) => {
  const uid = await getUID()
  if (!uid) return res.status(401).json({ error: 'Auth failed' })

  const { signatureBase64, clientNom, montant, prestations, notes, photos } = req.body

  // 1. Chercher le client dans Odoo par nom
  let partnerId = false
  try {
    const responsePartner = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'res.partner',
          method: 'search_read',
          args: [[['name', 'ilike', clientNom]]],
          kwargs: { fields: ['id', 'name'], limit: 1 }
        }
      })
    })
    const dataPartner = await responsePartner.json()
    if (dataPartner.result && dataPartner.result.length > 0) {
      partnerId = dataPartner.result[0].id
    }
  } catch (err) {
    console.error('Client non trouvé dans Odoo:', err)
  }

  // 2. Créer la facture avec le client lié
  const responseFacture = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'account.move',
        method: 'create',
        args: [{
          move_type: 'out_invoice',
          partner_id: partnerId,
          narration: notes || '',
          invoice_line_ids: prestations.map(p => ([0, 0, {
            name: p.label,
            price_unit: p.prix || 0,
            quantity: 1,
          }]))
        }],
        kwargs: {}
      }
    })
  })
  const dataFacture = await responseFacture.json()
  const factureId = dataFacture.result

  if (!factureId) return res.status(500).json({ error: 'Facture non créée' })

  // 3. Attacher la signature
  if (signatureBase64) {
    const signatureData = signatureBase64.replace('data:image/png;base64,', '')
    await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'ir.attachment',
          method: 'create',
          args: [{
            name: 'signature_' + clientNom + '.png',
            type: 'binary',
            datas: signatureData,
            res_model: 'account.move',
            res_id: factureId,
          }],
          kwargs: {}
        }
      })
    })
  }

  // 4. Attacher les photos
  if (photos && photos.length > 0) {
    for (let i = 0; i < photos.length; i++) {
      const photoData = photos[i].replace(/^data:image\/\w+;base64,/, '')
      await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'ir.attachment',
            method: 'create',
            args: [{
              name: 'photo_' + clientNom + '_' + (i + 1) + '.png',
              type: 'binary',
              datas: photoData,
              res_model: 'account.move',
              res_id: factureId,
            }],
            kwargs: {}
          }
        })
      })
    }
  }

  res.json({ success: true, factureId, partnerId })
})

app.post('/api/compte-rendu', async (req, res) => {
  const { clientEmail, clientNom, prestations, notes, montant, signature } = req.body

  try {
    await resend.emails.send({
      from: 'SaddleHub <onboarding@resend.dev>',
      to: clientEmail,
      subject: 'Compte rendu de votre séance — Équin\'Equilibre',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1D9E75;">Compte rendu de séance</h2>
          <p>Bonjour ${clientNom},</p>
          <p>Voici le résumé de votre séance avec Tammy — Équin'Equilibre.</p>
          <h3 style="color: #333;">Prestations réalisées</h3>
          <ul>
            ${prestations.map(p => '<li>' + p.label + (p.prix ? ' — ' + p.prix + ' CHF' : '') + '</li>').join('')}
          </ul>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <strong>Total : ${montant} CHF</strong>
          </div>
          ${notes ? '<h3 style="color: #333;">Notes</h3><p>' + notes + '</p>' : ''}
          ${signature ? '<h3 style="color: #333;">Signature</h3><img src="' + signature + '" style="border: 1px solid #ddd; border-radius: 8px; max-width: 300px;" />' : ''}
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #888; font-size: 12px;">Équin'Equilibre · Tammy · equinequilibre.odoo.com</p>
        </div>
      `
    })
    res.json({ success: true })
  } catch (err) {
    console.error('Erreur envoi email:', err)
    res.status(500).json({ error: 'Erreur envoi email' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log('✅ Serveur proxy Odoo démarré sur port ' + PORT)
})