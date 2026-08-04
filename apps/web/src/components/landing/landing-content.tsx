import {
  Alert,
  Badge,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  StatusBadge,
} from '@warrantypass/ui';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Cloud,
  FileUp,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  SearchCheck,
  ShieldCheck,
  Smartphone,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

const customerBenefits = [
  {
    icon: <Smartphone aria-hidden="true" />,
    title: 'One warranty wallet',
    description:
      'Find warranty dates, product details, and documents without searching through drawers.',
  },
  {
    icon: <FileUp aria-hidden="true" />,
    title: 'Keep unconnected products',
    description:
      'The future Manual Warranty Vault will keep your own invoices and warranty papers clearly labelled.',
  },
  {
    icon: <Wrench aria-hidden="true" />,
    title: 'A complete product story',
    description:
      'Claims, repairs, transfers, and recall notices will remain connected to each product record.',
  },
];

const businessBenefits = [
  'Issue tamper-resistant digital warranties',
  'Give customers a clear, searchable service trail',
  'Manage employees through scoped roles and permissions',
  'Handle claims, repair work, service centres, and recalls',
];

const steps = [
  {
    number: '01',
    title: 'Create the right account',
    description:
      'Customers register directly. Businesses apply and submit verification information.',
  },
  {
    number: '02',
    title: 'Receive or save a warranty',
    description:
      'Connected businesses issue verified records; customers can separately save personal copies.',
  },
  {
    number: '03',
    title: 'Act before it is too late',
    description:
      'Track expiry, find service information, and keep future claims and repair history together.',
  },
];

const faqs = [
  {
    question: 'Is a warranty I upload considered verified?',
    answer:
      'No. A personal upload is always labelled “User Uploaded.” Only a registered, verified business can issue a “Verified by Business” warranty.',
  },
  {
    question: 'Does a business become verified immediately after registering?',
    answer:
      'No. Every business application starts as Pending Verification. WarrantyPass reviews the supplied registration information and documents before approval.',
  },
  {
    question: 'Can I use WarrantyPass if a shop is not connected?',
    answer:
      'The planned paid Manual Warranty Vault will let customers record those purchases and preserve document images without implying business verification.',
  },
  {
    question: 'Will WarrantyPass support Bangla?',
    answer:
      'The interface foundation is prepared for English and future Bangla localization, including Bangladesh date, currency, and timezone conventions.',
  },
  {
    question: 'Can one employee work with more than one business?',
    answer:
      'Yes. Memberships, roles, and permissions are scoped per business, so the same account can have different responsibilities in different organizations.',
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: 'left' | 'center';
}): ReactNode {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      <p className="text-sm font-bold tracking-widest text-[var(--primary)] uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl leading-tight font-bold tracking-tight text-[var(--text)] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-[var(--text-muted)] sm:text-lg">{description}</p>
    </div>
  );
}

export function Hero(): ReactNode {
  return (
    <section className="overflow-hidden border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-24">
        <div>
          <Badge tone="success">
            <ShieldCheck aria-hidden="true" size={14} />
            Built for warranty trust
          </Badge>
          <h1 className="mt-6 text-4xl leading-[1.08] font-bold tracking-[-0.035em] text-[var(--text)] sm:text-5xl lg:text-6xl">
            Every warranty.
            <br />
            <span className="text-[var(--primary)]">Always within reach.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--text-muted)]">
            WarrantyPass brings verified business warranties and your own warranty papers into one
            secure digital wallet—without confusing one for the other.
          </p>
          <div className="xs:flex-row mt-8 flex flex-col gap-3">
            <Link
              href="/register"
              className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}
            >
              Create free account
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link
              href="/business/register"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Apply as a business
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--text-muted)]">
            {['Clear provenance labels', 'Private by default', 'Built for Bangladesh'].map(
              (item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check aria-hidden="true" size={16} className="text-[var(--primary)]" />
                  {item}
                </span>
              ),
            )}
          </div>
        </div>
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-8 -z-10 rounded-full bg-[var(--primary-soft)] opacity-70 blur-3xl"
          />
          <Image
            src="/images/warrantypass-dashboard-hero.png"
            alt="Illustration of paper receipts becoming organized digital warranty records"
            width={1536}
            height={1024}
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="h-auto w-full rounded-[1.75rem] border border-[var(--border)] shadow-[var(--shadow-elevated)]"
          />
        </div>
      </div>
    </section>
  );
}

export function ProblemAndSolution(): ReactNode {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The paper problem"
          title="A warranty is valuable only when you can find and trust it"
          description="Receipts fade. Papers disappear. Company portals rarely speak to each other. When a product fails, customers lose time proving what they purchased and businesses repeat manual checks."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {(
            [
              [
                'Scattered records',
                'Documents sit in drawers, chat messages, email, and unrelated websites.',
                FileUp,
              ],
              [
                'Unclear authenticity',
                'A photo of paper does not prove that the original business issued it.',
                SearchCheck,
              ],
              [
                'Broken service history',
                'Repairs and claim decisions become disconnected from the original purchase.',
                Wrench,
              ],
            ] as const
          ).map(([title, description, Icon]) => (
            <Card key={String(title)}>
              <CardHeader>
                <span className="grid size-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Icon aria-hidden="true" size={22} />
                </span>
                <CardTitle className="pt-3">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <Alert
          className="mt-6"
          tone="success"
          title="WarrantyPass preserves the source of every record"
          icon={<BadgeCheck aria-hidden="true" />}
        >
          Connected business records carry business verification. Personal records stay useful,
          private, and unmistakably user uploaded.
        </Alert>
      </div>
    </section>
  );
}

export function Benefits(): ReactNode {
  return (
    <>
      <section className="border-y border-[var(--border)] bg-[var(--surface)] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="For customers"
            title="Less paperwork. More confidence."
            description="A clear home for warranties today, designed to support the full ownership and service journey in later phases."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {customerBenefits.map((benefit) => (
              <Card key={benefit.title}>
                <CardHeader>
                  <span className="grid size-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                    {benefit.icon}
                  </span>
                  <CardTitle className="pt-3">{benefit.title}</CardTitle>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="for-business" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionHeading
              eyebrow="For businesses"
              title="Turn after-sales service into lasting trust"
              description="Issue authoritative digital records and give teams a secure workspace for the warranty lifecycle."
            />
            <Link
              href="/business/register"
              className={cn(buttonVariants({ variant: 'primary' }), 'mt-7')}
            >
              Start business application
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Verified business workspace</CardTitle>
                  <CardDescription>Available after application review</CardDescription>
                </div>
                <StatusBadge status="VERIFIED" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-4">
                {businessBenefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex gap-3 text-sm leading-6 text-[var(--text-muted)]"
                  >
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--success-soft)] text-[var(--success-text)]">
                      <Check aria-hidden="true" size={13} strokeWidth={3} />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Owner', 'Manager', 'Warranty Officer', 'Custom Role'].map((role) => (
                  <Badge key={role}>{role}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

export function Provenance(): ReactNode {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface)] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Clear by design"
          title="Verified is a fact, not a visual flourish"
          description="The source label stays visible so customers, businesses, and service teams understand what a record proves."
          align="center"
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
          <Card className="border-[var(--success-border)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-[var(--success-soft)] text-[var(--success-text)]">
                  <BadgeCheck aria-hidden="true" />
                </span>
                <StatusBadge status="VERIFIED" />
              </div>
              <CardTitle className="pt-3">Verified by Business</CardTitle>
              <CardDescription>
                Issued from the workspace of a business that WarrantyPass has reviewed and approved.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-[var(--info-border)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-[var(--info-soft)] text-[var(--info-text)]">
                  <FileUp aria-hidden="true" />
                </span>
                <StatusBadge status="USER_UPLOADED" />
              </div>
              <CardTitle className="pt-3">User Uploaded</CardTitle>
              <CardDescription>
                Saved by the customer for convenience. It is never presented as confirmation by the
                original company.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks(): ReactNode {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="A simple path from purchase to support"
          description="Designed around real ownership moments, not another folder of disconnected scans."
          align="center"
        />
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="relative text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--primary)] text-sm font-bold text-white shadow-sm">
                {step.number}
              </span>
              <h3 className="mt-5 text-lg font-bold text-[var(--text)]">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Plans(): ReactNode {
  return (
    <section
      id="plans"
      className="scroll-mt-24 border-y border-[var(--border)] bg-[var(--surface)] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Plan preview"
          title="Start with the records that matter"
          description="Pricing will be finalized before subscriptions launch. These previews explain the intended product boundaries."
          align="center"
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {[
            {
              icon: Smartphone,
              name: 'Customer',
              price: 'Free',
              interval: 'for connected warranties',
              features: [
                'Receive verified warranties',
                'Warranty wallet',
                'Future claims and alerts',
              ],
            },
            {
              icon: Cloud,
              name: 'Customer Vault',
              price: 'Yearly',
              interval: 'BDT pricing to be announced',
              features: [
                'Manual warranty records',
                'Private document storage',
                'Invoice and paper backups',
              ],
            },
            {
              icon: Building2,
              name: 'Business',
              price: 'Monthly',
              interval: 'BDT pricing to be announced',
              features: [
                'Verified warranty issuance',
                'Team roles and permissions',
                'Claims and service operations',
              ],
            },
          ].map((plan) => (
            <Card
              key={plan.name}
              className={plan.name === 'Customer Vault' ? 'border-[var(--primary-border)]' : ''}
            >
              <CardHeader>
                <plan.icon aria-hidden="true" className="text-[var(--primary)]" />
                <CardTitle className="pt-3">{plan.name}</CardTitle>
                <div className="pt-2">
                  <span className="text-3xl font-bold text-[var(--text)]">{plan.price}</span>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{plan.interval}</p>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-[var(--text-muted)]">
                      <Check
                        aria-hidden="true"
                        size={17}
                        className="shrink-0 text-[var(--primary)]"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Security(): ReactNode {
  const protections = [
    [
      LockKeyhole,
      'Private documents',
      'Warranty papers and invoices are designed to remain private by default.',
    ],
    [KeyRound, 'Scoped access', 'Business roles grant only the permissions an employee needs.'],
    [
      Fingerprint,
      'Account protection',
      'Secure password, session, and audit foundations precede authentication.',
    ],
    [
      Cloud,
      'Protected storage',
      'Production documents belong in private object storage, never database blobs.',
    ],
  ] as const;

  return (
    <section id="security" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <SectionHeading
            eyebrow="Security and trust"
            title="Sensitive records deserve deliberate protection"
            description="WarrantyPass treats identity, documents, serial numbers, and business verification evidence as security-sensitive data."
          />
          <div className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-sm font-semibold text-[var(--primary-strong)]">
            <ShieldCheck aria-hidden="true" size={19} />
            Security controls start in the foundation
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {protections.map(([Icon, title, description]) => (
            <div
              key={title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <Icon aria-hidden="true" className="text-[var(--primary)]" />
              <h3 className="mt-4 font-bold text-[var(--text)]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FrequentlyAskedQuestions(): ReactNode {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface)] py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
        <SectionHeading
          eyebrow="Questions"
          title="Know what WarrantyPass proves"
          description="Clear boundaries help every record remain useful and trustworthy."
        />
        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-[var(--text)] [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span
                  className="text-xl font-light text-[var(--primary)] group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="max-w-2xl pb-5 text-sm leading-7 text-[var(--text-muted)]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCallToAction(): ReactNode {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-[#123c35] px-6 py-12 text-white shadow-[var(--shadow-elevated)] sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-12">
          <div className="max-w-2xl">
            <p className="text-sm font-bold tracking-widest text-emerald-200 uppercase">Be ready</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Give every important purchase a reliable home
            </h2>
            <p className="mt-4 text-base leading-7 text-emerald-50/80">
              Create your customer account, or begin a business application for review.
            </p>
          </div>
          <div className="xs:flex-row mt-8 flex flex-col gap-3 lg:mt-0 lg:shrink-0">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'lg' }),
                'border-white bg-white text-[#123c35] hover:bg-emerald-50',
              )}
            >
              Create free account
            </Link>
            <Link
              href="/business/register"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'lg' }),
                'text-white hover:bg-white/10 hover:text-white',
              )}
            >
              Business application
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
