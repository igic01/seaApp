# https://docs.python.org/3/library/re.html
import re

class RegexDetection:
    def __init__(self):
        # Regex patterns
        self.patterns = {
            'email': r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}',
            'iban': r'[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}',
            'phone': r'(?:\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
            'date': r'\b\d{2}\.\d{2}\.\d{4}\b'
        }
    
    def contains_email(self, text):
        """Check if text contains an email"""
        return bool(re.search(self.patterns['email'], text))
    
    def contains_iban(self, text):
        """Check if text contains an IBAN"""
        return bool(re.search(self.patterns['iban'], text))
    
    def contains_phone(self, text):
        """Check if text contains a phone number"""
        return bool(re.search(self.patterns['phone'], text))
    
    def contains_date(self, text):
        """Check if text contains a date"""
        return bool(re.search(self.patterns['date'], text))
    
    def contains_sensitive(self, text):
        """Check if text contains any sensitive data (email, iban, phone, or date)"""
        return (self.contains_email(text) or 
                self.contains_iban(text) or 
                self.contains_phone(text) or
                self.contains_date(text))
