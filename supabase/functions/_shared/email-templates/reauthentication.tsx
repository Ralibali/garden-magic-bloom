/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Din verifieringskod</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🌱</Text>
        <Heading style={h1}>Bekräfta din identitet</Heading>
        <Text style={text}>Använd koden nedan för att bekräfta din identitet:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Koden slutar gälla inom kort. Om du inte begärde detta kan du lugnt ignorera detta mejl.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#4A7C59',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
