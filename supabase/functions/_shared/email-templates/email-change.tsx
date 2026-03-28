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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Bekräfta din nya e-postadress för {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🌱</Text>
        <Heading style={h1}>Bekräfta e-postbyte</Heading>
        <Text style={text}>
          Du har begärt att byta e-postadress för {siteName} från{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          till{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Klicka på knappen nedan för att bekräfta bytet:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Bekräfta e-postbyte
        </Button>
        <Text style={footer}>
          Om du inte begärde detta bör du säkra ditt konto omedelbart.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
