import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db, ensureDb } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await ensureDb();
        const result = await db.execute({
          sql: 'SELECT * FROM admin_users WHERE email = ?',
          args: [credentials.email],
        });

        const user = result.rows[0] as unknown as
          | { id: number; email: string; password_hash: string }
          | undefined;
        if (!user) return null;

        const valid = bcrypt.compareSync(credentials.password, user.password_hash as string);
        if (!valid) return null;

        return { id: String(user.id), email: user.email as string };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
};
