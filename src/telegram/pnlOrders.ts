import axios  from 'axios';

 const getPNL = async (ctx:any) => {
  try {
    const apiUrl = 'https://api.gmx.io'; // GMX API URL
    const endpoint = `/pnl/0x23055E68DAfC3670b20651BD0B2E0Bcd46977b22`; // PNL endpoint for the specific address
    const response = await axios.get(apiUrl + endpoint);
    const pnl = response.data;

    console.log('PNL:', pnl);
    return pnl;
  } catch (error) {
    console.error('Error fetching PNL:', error);
    throw error;
  }
}

export default getPNL;



