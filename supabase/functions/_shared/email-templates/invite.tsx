/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Du har blivit inbjuden till {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🌱</Text>
        <Heading style={h1}>Du har blivit inbjuden!</Heading>
        <Text style={text}>
          Du har blivit inbjuden att gå med i{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Klicka på knappen nedan för att acceptera inbjudan och skapa ditt konto.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Acceptera inbjudan
        </Button>
        <Text style={footer}>
          Om du inte förväntade dig denna inbjudan kan du lugnt ignorera detta mejl.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const logo = { fontSize: '32px', margin: '0 0 10px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#2d3b2d',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: '#4A7C59', textDecoration: 'underline' }
const button = {
  backgroundColor: '#4A7C59',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
