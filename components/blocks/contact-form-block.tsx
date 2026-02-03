'use client';

import { useState } from 'react';
import type { ContactFormBlockProps, ContactFormBlockLocaleContent, ContactFormField } from '@/lib/cms/block-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils/cn';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';

// Field labels by locale
const fieldLabels: Record<string, Record<ContactFormField, string>> = {
  en: {
    name: 'Full Name',
    email: 'Email Address',
    phone: 'Phone Number',
    message: 'Message',
    subject: 'Subject',
    company: 'Company',
  },
  lt: {
    name: 'Vardas ir pavardė',
    email: 'El. paštas',
    phone: 'Telefono numeris',
    message: 'Žinutė',
    subject: 'Tema',
    company: 'Įmonė',
  },
  ru: {
    name: 'Полное имя',
    email: 'Электронная почта',
    phone: 'Номер телефона',
    message: 'Сообщение',
    subject: 'Тема',
    company: 'Компания',
  },
};

// Field placeholders
const fieldPlaceholders: Record<string, Record<ContactFormField, string>> = {
  en: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+370 600 00000',
    message: 'How can we help you?',
    subject: 'General inquiry',
    company: 'Company name',
  },
  lt: {
    name: 'Jonas Jonaitis',
    email: 'jonas@pavyzdys.lt',
    phone: '+370 600 00000',
    message: 'Kaip galime jums padėti?',
    subject: 'Bendra užklausa',
    company: 'Įmonės pavadinimas',
  },
  ru: {
    name: 'Иван Иванов',
    email: 'ivan@example.com',
    phone: '+370 600 00000',
    message: 'Как мы можем вам помочь?',
    subject: 'Общий вопрос',
    company: 'Название компании',
  },
};

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  subject: string;
  company: string;
}

interface FormErrors {
  [key: string]: string;
}

export function ContactFormBlock({ id, content, settings, locale }: ContactFormBlockProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
    subject: '',
    company: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Get localized content with fallback to English
  const localeContent: ContactFormBlockLocaleContent | undefined =
    (content[locale as keyof typeof content] as ContactFormBlockLocaleContent | undefined) ||
    content.en;

  if (!localeContent) {
    return null;
  }

  const { heading, description, submitText, successMessage, errorMessage } = localeContent;
  const { fields, showPhone, showAddress } = content;

  const labels = fieldLabels[locale] || fieldLabels.en;
  const placeholders = fieldPlaceholders[locale] || fieldPlaceholders.en;

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (fields.includes('name') && !formData.name.trim()) {
      newErrors.name = locale === 'lt' ? 'Privalomas laukas' : locale === 'ru' ? 'Обязательное поле' : 'Required field';
    }

    if (fields.includes('email')) {
      if (!formData.email.trim()) {
        newErrors.email = locale === 'lt' ? 'Privalomas laukas' : locale === 'ru' ? 'Обязательное поле' : 'Required field';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = locale === 'lt' ? 'Neteisingas el. paštas' : locale === 'ru' ? 'Неверный email' : 'Invalid email';
      }
    }

    if (fields.includes('message') && !formData.message.trim()) {
      newErrors.message = locale === 'lt' ? 'Privalomas laukas' : locale === 'ru' ? 'Обязательное поле' : 'Required field';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (field: ContactFormField, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // TODO: Implement actual form submission API
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
        subject: '',
        company: '',
      });
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form field
  const renderField = (field: ContactFormField) => {
    if (!fields.includes(field)) return null;

    const isRequired = field === 'name' || field === 'email' || field === 'message';

    if (field === 'message') {
      return (
        <div key={field} className="sm:col-span-2">
          <label htmlFor={field} className="block text-sm font-medium text-foreground mb-2">
            {labels[field]}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </label>
          <Textarea
            id={field}
            name={field}
            value={formData[field]}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder={placeholders[field]}
            rows={5}
            error={errors[field]}
            disabled={isSubmitting}
          />
        </div>
      );
    }

    return (
      <div key={field}>
        <label htmlFor={field} className="block text-sm font-medium text-foreground mb-2">
          {labels[field]}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </label>
        <Input
          id={field}
          name={field}
          type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
          value={formData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder={placeholders[field]}
          error={errors[field]}
          disabled={isSubmitting}
        />
      </div>
    );
  };

  return (
    <section
      id={id}
      data-block-type="contact_form"
      className="py-12 md:py-16 lg:py-20 bg-muted/30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">
          {/* Left Column - Info */}
          <div className="lg:col-span-2">
            {/* Header */}
            {heading && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
                {heading}
              </h2>
            )}
            {description && (
              <p className="text-base sm:text-lg text-muted-foreground mb-8">
                {description}
              </p>
            )}

            {/* Contact Info */}
            <div className="space-y-4">
              {showPhone && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <span>+370 600 00000</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <span>{content.recipientEmail || 'info@example.com'}</span>
              </div>
              {showAddress && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <span>Vilnius, Lithuania</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-xl border border-border p-6 sm:p-8">
              {/* Success Message */}
              {submitStatus === 'success' && (
                <Alert variant="success" className="mb-6">
                  <CheckCircle className="w-5 h-5" />
                  <span>{successMessage}</span>
                </Alert>
              )}

              {/* Error Message */}
              {submitStatus === 'error' && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="w-5 h-5" />
                  <span>{errorMessage || 'Something went wrong. Please try again.'}</span>
                </Alert>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Render fields in order */}
                {renderField('name')}
                {renderField('email')}
                {renderField('phone')}
                {renderField('company')}
                {renderField('subject')}
                {renderField('message')}

                {/* Submit Button */}
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full sm:w-auto"
                    isLoading={isSubmitting}
                    rightIcon={!isSubmitting ? <Send className="w-4 h-4" /> : undefined}
                  >
                    {submitText}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
