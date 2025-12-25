// File: /pages/api/airtable-languages.js

export default async function handler(req, res) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !tableName) {
    return res.status(500).json({ error: 'Missing Airtable environment variables' });
  }

  try {
    const airtableRes = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!airtableRes.ok) {
      const errorDetails = await airtableRes.json();
      return res.status(airtableRes.status).json({
        error: 'Failed to fetch languages from Airtable',
        details: errorDetails,
      });
    }

    const data = await airtableRes.json();
    const languages = data.records
      .map(record => record.fields?.Primary_Language || null)
      .filter(Boolean);

    return res.status(200).json({ languages });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error', message: err.message });
  }
}
