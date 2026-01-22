import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import KakaoProvider from 'next-auth/providers/kakao'
import GoogleProvider from 'next-auth/providers/google'
import db from './db'
import bcrypt from 'bcrypt'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  providers: [
    // ✅ 이메일 로그인
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: '아이디', type: 'text' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials) return null

        const [rows]: any = await db.query(
          'SELECT * FROM users WHERE username = ?',
          [credentials.username],
        )

        const user = rows[0]
        if (!user) return null

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        )

        if (!isValid) return null

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
        }
      },
    }),

    // ✅ 카카오
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),

    // ✅ 구글
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user && account?.provider === 'credentials') {
        token.id = String(user.id)
      }

      if (account?.provider === 'kakao') {
        token.kakaoId = (profile as any)?.id
      }

      if (account?.provider === 'google') {
        token.googleId = (profile as any)?.sub
      }

      return token
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = String(token.id)
      }
      return session
    },

    // ✅ 이거 추가!!!
    async redirect({ url, baseUrl }) {
      // 회원가입 페이지로 보내고 싶다면
      return `${baseUrl}/signup`
    },
  },
}
