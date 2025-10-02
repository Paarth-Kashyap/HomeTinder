import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode, onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  React.useEffect(() => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setCountryCode('');
    setPhoneError(null);
    setError(null);
    setShowPassword(false);
  }, [mode]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);
    
    // Progressive formatting as user types
    if (limitedDigits.length === 0) {
      return '';
    } else if (limitedDigits.length <= 3) {
      return `(${limitedDigits}`;
    } else if (limitedDigits.length <= 6) {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
    } else {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    }
  };

  const validatePhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 0) {
      return 'Phone number is required';
    }
    if (digits.length < 10) {
      return 'Phone number must be 10 digits';
    }
    if (digits.length > 10) {
      return 'Phone number must be exactly 10 digits';
    }
    return null;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    
    const error = validatePhoneNumber(formatted);
    setPhoneError(error);
  };

  const getPhoneDigits = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const getFullPhoneNumber = () => {
    const digits = getPhoneDigits(phoneNumber);
    return digits ? `${countryCode}${digits}` : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate phone number for signup
    if (mode === 'signup') {
      const phoneValidationError = validatePhoneNumber(phoneNumber);
      if (phoneValidationError) {
        setPhoneError(phoneValidationError);
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        // Get full phone number with country code
        const fullPhoneNumber = getFullPhoneNumber();
        await signUp(email, password, firstName, lastName, fullPhoneNumber);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-200 blur-3xl opacity-40" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-secondary-200 blur-3xl opacity-40" />

      <div className="relative z-10 flex items-center justify-center py-16 px-6 sm:px-8 lg:px-10">
        <div className="w-full max-w-lg">
          <div className="card p-10 sm:p-12">
            <div className="flex flex-col items-center text-center">
              <img
                src="/HomeTinder.svg"
                alt="HomeTinder"
                className="h-14 w-auto"
              />
              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="mt-3 text-sm text-gray-600">
                {mode === 'signin' ? "New here? " : 'Already a member? '}
                <button
                  type="button"
                  onClick={onToggleMode}
                  className="font-semibold text-primary-700 hover:text-primary-800"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>

            <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                          First name
                        </label>
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          autoComplete="given-name"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="mt-1 block w-full rounded-2xl border border-gray-300 bg-white/90 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          placeholder="Jane"
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                          Last name
                        </label>
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          autoComplete="family-name"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="mt-1 block w-full rounded-2xl border border-gray-300 bg-white/90 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                        Phone number
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="mt-1 block w-24 rounded-2xl border border-gray-300 bg-white/90 px-3 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        >
                          <option value="+54">AR +54</option>
                          <option value="+61">AU +61</option>
                          <option value="+43">AT +43</option>
                          <option value="+973">BH+973</option>
                          <option value="+32">BE +32</option>
                          <option value="+55">🇧🇷 +55</option>
                          <option value="+1">CA +1</option>
                          <option value="+56">🇨🇱 +56</option>
                          <option value="+86">🇨🇳 +86</option>
                          <option value="+57">🇨🇴 +57</option>
                          <option value="+420">🇨🇿 +420</option>
                          <option value="+45">🇩🇰 +45</option>
                          <option value="+20">🇪🇬 +20</option>
                          <option value="+372">🇪🇪 +372</option>
                          <option value="+34">🇪🇸 +34</option>
                          <option value="+358">🇫🇮 +358</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+49">🇩🇪 +49</option>
                          <option value="+36">🇭🇺 +36</option>
                          <option value="+91">🇮🇳 +91</option>
                          <option value="+353">🇮🇪 +353</option>
                          <option value="+39">🇮🇹 +39</option>
                          <option value="+81">🇯🇵 +81</option>
                          <option value="+254">🇰🇪 +254</option>
                          <option value="+82">🇰🇷 +82</option>
                          <option value="+965">🇰🇼 +965</option>
                          <option value="+371">🇱🇻 +371</option>
                          <option value="+370">🇱🇹 +370</option>
                          <option value="+52">🇲🇽 +52</option>
                          <option value="+234">🇳🇬 +234</option>
                          <option value="+31">🇳🇱 +31</option>
                          <option value="+64">🇳🇿 +64</option>
                          <option value="+968">🇴🇲 +968</option>
                          <option value="+51">🇵🇪 +51</option>
                          <option value="+48">🇵🇱 +48</option>
                          <option value="+974">🇶🇦 +974</option>
                          <option value="+40">🇷🇴 +40</option>
                          <option value="+7">🇷🇺 +7</option>
                          <option value="+966">🇸🇦 +966</option>
                          <option value="+421">🇸🇰 +421</option>
                          <option value="+386">🇸🇮 +386</option>
                          <option value="+27">🇿🇦 Africa +27</option>
                          <option value="+46">🇸🇪 +46</option>
                          <option value="+41">🇨🇭 +41</option>
                          <option value="+971">🇦🇪 +971</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+380">🇺🇦 +380</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+58">🇻🇪 +58</option>
                        </select>
                        <input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          autoComplete="tel"
                          required
                          value={phoneNumber}
                          onChange={handlePhoneChange}
                          className={`mt-1 flex-1 rounded-2xl border px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:ring-primary-500 sm:text-sm ${
                            phoneError 
                              ? 'border-red-300 bg-red-50 focus:border-red-500' 
                              : 'border-gray-300 bg-white/90 focus:border-primary-500'
                          }`}
                          placeholder="(555) 123-4567"
                          maxLength={14} // (XXX) XXX-XXXX format
                        />
                      </div>
                      {phoneError && (
                        <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                      )}
                    </div>
                  </>
                )}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-gray-300 bg-white/90 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs font-medium text-primary-700 hover:text-primary-800"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-gray-300 bg-white/90 px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full rounded-2xl py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait…' : (mode === 'signin' ? 'Sign in' : 'Create account')}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="w-full rounded-2xl border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.954,4,4,12.954,4,24 s8.954,20,20,20s20-8.954,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.369,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.063,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.197l-6.191-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.278-7.949l-6.49,5.001C9.651,39.251,16.292,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.098,5.564c0,0,0,0,0,0l6.191,5.238 C35.845,39.269,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
                Continue with Google
              </button>

              <p className="text-[11px] text-center text-gray-500">
                By continuing, you agree to our Terms and Privacy Policy.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
