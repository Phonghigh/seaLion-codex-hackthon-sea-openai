'use client';
import type { ReactNode } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@seapilot/ui';

export function CaseSection({ title, children, className = '', defaultOpen = true }: { title: string; children: ReactNode; className?: string; defaultOpen?: boolean }) {
  return <Accordion type="single" collapsible defaultValue={defaultOpen ? 'section' : undefined} className={`case-disclosure ${className}`}>
    <AccordionItem value="section">
      <AccordionTrigger className="case-disclosure-trigger">{title}</AccordionTrigger>
      <AccordionContent className="case-disclosure-content">{children}</AccordionContent>
    </AccordionItem>
  </Accordion>;
}
