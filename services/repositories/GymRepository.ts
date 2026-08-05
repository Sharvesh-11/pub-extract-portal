import { query } from '@/lib/db';

export class GymRepository {
  async findAll() {
    const res = await query('SELECT * FROM gyms');
    return res.rows;
  }

  async findById(id: string) {
    const res = await query('SELECT * FROM gyms WHERE id = $1', [id]);
    return res.rows[0];
  }
}
