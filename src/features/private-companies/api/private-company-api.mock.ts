import {
  privateCompanyProfileSchema,
  type PrivateCompanyProfile,
} from '@/schemas/private-company'
import { getMockPrivateCompanyProfile } from '../mocks/fixtures'

export async function fetchPrivateCompanyProfileMock(
  cui: string,
): Promise<PrivateCompanyProfile | null> {
  await new Promise((resolve) => setTimeout(resolve, 120))
  const profile = getMockPrivateCompanyProfile(cui)
  if (profile === null) {
    return null
  }
  return privateCompanyProfileSchema.parse(profile)
}
