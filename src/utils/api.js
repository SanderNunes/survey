// File reserved for external API calls
import axios from 'axios';
import { createSlug } from './constants';

const netlifyToken = import.meta.env.VITE_NETLIFY_ACCESS_TOKEN;
const netlifyBase = import.meta.env.VITE_NETLIFY_API_URL;

export const getCallsIndicators = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_APP_QUALITY_API_URL}/africell`, {
      headers: {
        'Authorization': `${import.meta.env.VITE_APP_QUALITY_AUTH_TOKEN}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

function generateCustomID(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5);
  return `${createSlug(prefix)}-${timestamp}-${random}`;
}

/**
 * Cria um novo site na netlify e faz deploy de um zip como conteúdo do site
 * @see docs https://open-api.netlify.com/#/default/createSite
 */
export async function deployZipToNetlify({
  projectName, deployAsset, deployTitle = 'new deploy'
}) {
  try {
    const siteFd = new FormData();
    const slug = generateCustomID(projectName)
    siteFd.append('name', slug || 'AFRICELL-KNOWLEDGE-BASE-CURSO');

    const res = await fetch(`${netlifyBase}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${netlifyToken}`
      },
      body: siteFd
    });

    const newSiteData = await res.json();

    if (newSiteData?.id) {
      const contentFd = new FormData();

      contentFd.append('title', deployTitle || 'new deploy');
      contentFd.append('zip', deployAsset, deployAsset.name || 'build.zip');

      await fetch(`${netlifyBase}/sites/${newSiteData?.id}/builds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${netlifyToken}`
        },
        body: contentFd
      });
    }

    return newSiteData?.ssl_url;
  } catch (e) {
    console.error('Netlify Zip Deploy error', e);
  }
}
