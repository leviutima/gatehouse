import axios from 'axios'
import { env } from '@/shared/config'

export const adminHttp = axios.create({
  baseURL: env.VITE_GATEHOUSE_ISSUER.replace(/\/+$/, ''),
})
