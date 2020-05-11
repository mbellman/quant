import axios from 'axios';
import { plotData } from './render';

async function main() {
  const { data } = await axios.get('/api/test');

  plotData(data);
}

main();