import React, { useEffect, useState } from 'react';
import fetchAirtableOptions from 'lib/airtable-fetch';

// RefomReportForm - Dropdowns populated from Airtable data

export default function RefomReportForm() {
  const [options, setOptions] = useState({
    countries: [],
    tiers: [],
    timeFrames: [],
    companySizes: [],
  });

  useEffect(() => {
    let mounted = true;
    fetchAirtableOptions()
      .then((data) => {
        if (mounted && data) {
          setOptions({
            countries: data.countries ?? [],
            tiers: data.tiers ?? [],
            timeFrames: data.timeFrames ?? [],
            companySizes: data.companySizes ?? [],
          });
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load Airtable options', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <form>
      <div>
        <label>Country</label>
        <select name="country">
          <option value="">Select country</option>
          {options.countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Tier</label>
        <select name="tier">
          <option value="">Select tier</option>
          {options.tiers.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Company Size</label>
        <select name="companySize">
          <option value="">Select size</option>
          {options.companySizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Time Frame</label>
        <select name="timeFrame">
          <option value="">Select time frame</option>
          {options.timeFrames.map((tf) => (
            <option key={tf} value={tf}>{tf}</option>
          ))}
        </select>
      </div>

      {/* The rest of your existing form fields would continue here. */}
    </form>
  );
}
