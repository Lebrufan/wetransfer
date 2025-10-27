import { supabase } from '@/lib/supabase'

export const supabaseClient = {
  auth: {
    async me() {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error('Not authenticated')

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (userError) throw userError

      return {
        id: user.id,
        email: user.email,
        full_name: userData?.full_name || user.user_metadata?.full_name,
        phone: userData?.phone || user.user_metadata?.phone,
        role: userData?.role || 'user',
        ...userData
      }
    },

    async redirectToLogin(returnUrl) {
      const redirectTo = returnUrl ? `${window.location.origin}${returnUrl}` : window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      })
      if (error) console.error('Login error:', error)
    },

    async logout() {
      await supabase.auth.signOut()
      window.location.href = '/'
    }
  },

  entities: {
    Route: {
      async list() {
        const { data, error } = await supabase
          .from('routes')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data
      },

      async create(routeData) {
        const { data, error } = await supabase
          .from('routes')
          .insert(routeData)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async update(id, updates) {
        const { data, error } = await supabase
          .from('routes')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async delete(id) {
        const { error } = await supabase
          .from('routes')
          .delete()
          .eq('id', id)

        if (error) throw error
        return { success: true }
      }
    },

    VehicleType: {
      async list() {
        const { data, error } = await supabase
          .from('vehicle_types')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data
      },

      async filter(filters = {}) {
        let query = supabase
          .from('vehicle_types')
          .select('*')

        if (filters.active !== undefined) {
          query = query.eq('active', filters.active)
        }

        query = query.order('created_at', { ascending: false })

        const { data, error } = await query

        if (error) throw error
        return data
      },

      async create(vehicleData) {
        const { data, error } = await supabase
          .from('vehicle_types')
          .insert(vehicleData)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async update(id, updates) {
        const { data, error } = await supabase
          .from('vehicle_types')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async delete(id) {
        const { error } = await supabase
          .from('vehicle_types')
          .delete()
          .eq('id', id)

        if (error) throw error
        return { success: true }
      }
    },

    AdditionalItem: {
      async list() {
        const { data, error } = await supabase
          .from('additional_items')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data
      },

      async create(itemData) {
        const { data, error } = await supabase
          .from('additional_items')
          .insert(itemData)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async update(id, updates) {
        const { data, error } = await supabase
          .from('additional_items')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async delete(id) {
        const { error } = await supabase
          .from('additional_items')
          .delete()
          .eq('id', id)

        if (error) throw error
        return { success: true }
      }
    },

    PricingRule: {
      async list() {
        const { data, error } = await supabase
          .from('pricing_rules')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data
      },

      async create(ruleData) {
        const { data, error } = await supabase
          .from('pricing_rules')
          .insert(ruleData)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async update(id, updates) {
        const { data, error } = await supabase
          .from('pricing_rules')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async delete(id) {
        const { error } = await supabase
          .from('pricing_rules')
          .delete()
          .eq('id', id)

        if (error) throw error
        return { success: true }
      }
    },

    FrequentLocation: {
      async list() {
        const { data, error } = await supabase
          .from('frequent_locations')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data
      },

      async create(locationData) {
        const { data, error } = await supabase
          .from('frequent_locations')
          .insert(locationData)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async update(id, updates) {
        const { data, error } = await supabase
          .from('frequent_locations')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async delete(id) {
        const { error } = await supabase
          .from('frequent_locations')
          .delete()
          .eq('id', id)

        if (error) throw error
        return { success: true }
      }
    },

    Booking: {
      async list() {
        const { data, error } = await supabase
          .from('bookings')
          .select('*, route:routes(*), vehicle_type:vehicle_types(*)')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data
      },

      async get(id) {
        const { data, error } = await supabase
          .from('bookings')
          .select('*, route:routes(*), vehicle_type:vehicle_types(*)')
          .eq('id', id)
          .maybeSingle()

        if (error) throw error
        return data
      },

      async create(bookingData) {
        const { data, error } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async update(id, updates) {
        const { data, error } = await supabase
          .from('bookings')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async delete(id) {
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', id)

        if (error) throw error
        return { success: true }
      }
    },

    QuoteRequest: {
      async list() {
        const { data, error } = await supabase
          .from('quote_requests')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return data
      },

      async create(quoteData) {
        const { data, error } = await supabase
          .from('quote_requests')
          .insert(quoteData)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async update(id, updates) {
        const { data, error } = await supabase
          .from('quote_requests')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return data
      },

      async delete(id) {
        const { error } = await supabase
          .from('quote_requests')
          .delete()
          .eq('id', id)

        if (error) throw error
        return { success: true }
      }
    },

    AppConfig: {
      async list() {
        const { data, error } = await supabase
          .from('app_config')
          .select('*')

        if (error) throw error
        return data
      },

      async get(key) {
        const { data, error } = await supabase
          .from('app_config')
          .select('*')
          .eq('key', key)
          .maybeSingle()

        if (error) throw error
        return data
      },

      async upsert(key, value) {
        const { data, error } = await supabase
          .from('app_config')
          .upsert({ key, value }, { onConflict: 'key' })
          .select()
          .single()

        if (error) throw error
        return data
      }
    }
  }
}

export const base44 = supabaseClient
