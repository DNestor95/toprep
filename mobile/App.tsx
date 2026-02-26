import 'react-native-url-polyfill/auto'
import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { Session } from '@supabase/supabase-js'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './src/lib/supabase'
import LoginScreen from './src/screens/LoginScreen'
import AppNavigator from './src/navigation/AppNavigator'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setInitializing(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (initializing) return null

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {session ? <AppNavigator /> : <LoginScreen />}
    </NavigationContainer>
  )
}
