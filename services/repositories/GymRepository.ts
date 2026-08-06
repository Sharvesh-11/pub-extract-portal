import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export class GymRepository {
  async findAll() {
    const res = await query('SELECT * FROM gyms');
    return res.rows;
  }

  async findById(id: string) {
    const res = await query('SELECT * FROM gyms WHERE id = $1', [id]);
    return res.rows[0];
  }

  async create(name: string) {
    const id = uuidv4();
    const res = await query(
      'INSERT INTO gyms (id, name, status) VALUES ($1, $2, $3) RETURNING *',
      [id, name, 'active']
    );
    return res.rows[0];
  }
}
