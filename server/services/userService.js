const bcrypt = require('bcrypt');
const { getSupabase } = require('../config/database');

class UserService {
  static async create({ email, password }) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log('Creating user with email:', email);

      // Check if user already exists
      const existingUser = await this.getByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            email: email.toLowerCase().trim(),
            password: hashedPassword
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating user:', error);
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('User with this email already exists');
        }
        throw error;
      }

      console.log('User created successfully:', data.id);
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async getByEmail(email) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log('Fetching user by email:', email);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        console.error('Supabase error fetching user by email:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  static async authenticateWithPassword(email, password) {
    try {
      const user = await this.getByEmail(email);
      if (!user) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      // Remove password from returned user object
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw error;
    }
  }

  static async get(id) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log('Fetching user by ID:', id);

      const { data, error } = await supabase
        .from('users')
        .select('id, email, created_at, updated_at')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        console.error('Supabase error fetching user by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log('Updating user:', id);

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('id, email, created_at, updated_at')
        .single();

      if (error) {
        console.error('Supabase error updating user:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      console.log('Deleting user:', id);

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error deleting user:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

module.exports = UserService;