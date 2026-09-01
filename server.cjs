const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

const ODOO_URL = process.env.ODOO_URL
const ODOO_DB = process.env.ODOO_DB
const ODOO_USER = process.env.ODOO_USER
const ODOO_PASSWORD = process.env.ODOO_PASSWORD

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
        kwargs: {
          fields: ['name', 'email', 'phone', 'street', 'city', 'customer_rank'],
          limit: 50,
        }
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
        kwargs: {
          fields: ['name', 'email', 'phone', 'street', 'city'],
          limit: 50,
        }
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
        kwargs: {
          fields: ['name', 'list_price', 'categ_id', 'qty_available'],
          limit: 100,
        }
      }
    })
  })
  const data = await response.json()
  res.json(data.result || [])
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`✅ Serveur proxy Odoo démarré sur port ${PORT}`)
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
        kwargs: {
          fields: ['name', 'start', 'stop', 'partner_ids', 'location', 'description'],
          limit: 100,
        }
      }
    })
  })
  const data = await response.json()
  res.json(data.result || [])
})

app.get('/api/metriques', async (req, res) => {
  const uid = await getUID()
  if (!uid) return res.status(401).json({ error: 'Auth failed' })

  // RDVs du mois en cours
  const maintenant = new Date()
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString()
  const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0).toISOString()

  const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'calendar.event',
        method: 'search_read',
        args: [[['start', '>=', debutMois], ['start', '<=', finMois]]],
        kwargs: {
          fields: ['name', 'start', 'stop', 'location'],
          limit: 100,
        }
      }
    })
  })
  const data = await response.json()
  const rdvs = data.result || []

  // Pistes CRM en attente
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
        kwargs: {
          fields: ['name', 'partner_name', 'create_date'],
          limit: 50,
        }
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
        kwargs: {
          fields: ['name', 'partner_name', 'email_from', 'phone', 'street', 'city', 'description', 'create_date', 'stage_id'],
          limit: 100,
        }
      }
    })
  })
  const data = await response.json()
  res.json(data.result || [])
})