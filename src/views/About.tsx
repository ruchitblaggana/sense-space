// SenseSpace — Developer / About
// An engineering case study presenting Ruchit Blaggana's background and the smart-hat project.

import {
  Award,
  Battery,
  Cpu,
  GraduationCap,
  HandHeart,
  Medal,
  Microscope,
  Radio,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';
import { Card, SectionLabel, Badge } from '../components/ui';

export function About() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
      <SectionLabel>Developer / About</SectionLabel>
      <h1 className="font-display text-4xl text-ink mt-2 leading-tight">
        The story behind SenseSpace
      </h1>
      <p className="text-base text-muted mt-3 max-w-2xl leading-relaxed">
        A student-built assistive-technology laboratory, rooted in a real smart-hat project and extended into an
        interactive engineering tool.
      </p>

      {/* Profile */}
      <Card className="p-6 mt-8 bg-grid-fine">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <SectionLabel className="mb-2 block">About the developer</SectionLabel>
            <h2 className="font-display text-2xl text-ink mb-3">Ruchit Blaggana</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2"><dt className="text-muted w-28 shrink-0">School</dt><dd className="text-ink">Delhi Public School, Vasant Kunj, New Delhi</dd></div>
              <div className="flex gap-2"><dt className="text-muted w-28 shrink-0">Level</dt><dd className="text-ink">Grade 12, pursuing</dd></div>
              <div className="flex gap-2"><dt className="text-muted w-28 shrink-0">Intended major</dt><dd className="text-ink">Computer Science</dd></div>
              <div className="flex gap-2"><dt className="text-muted w-28 shrink-0">Destinations</dt><dd className="text-ink">USA, Canada, Australia</dd></div>
            </dl>
          </div>
          <div>
            <SectionLabel className="mb-2 block">Academic record</SectionLabel>
            <div className="space-y-1.5">
              <GradeRow grade="Grade 9" score="93.2%" />
              <GradeRow grade="Grade 10" score="94.4%" />
              <GradeRow grade="Grade 11" score="80.4%" />
              <GradeRow grade="Grade 12" score="Pursuing" />
            </div>
          </div>
        </div>
      </Card>

      {/* Smart Hat Project */}
      <Section title="The Smart Hat Project" icon={Wrench}>
        <p className="text-sm text-ink-soft leading-relaxed">
          Ruchit completed a summer program in Artificial Intelligence, Machine Learning, and Robotics at IIT Delhi
          through Rancho Labs. He designed and developed a smart hat for people with visual impairments using:
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <ProjectComponent icon={Cpu} title="Arduino Uno" desc="Microcontroller platform for hardware programming." />
          <ProjectComponent icon={Radio} title="Ultrasonic Sensor" desc="Distance sensing for obstacle detection." />
          <ProjectComponent icon={Battery} title="Alert Mechanism" desc="Notifications for overhead hazards." />
        </div>
        <p className="text-sm text-ink-soft leading-relaxed mt-4">
          The project was designed to detect overhead obstacles and provide alerts to help visually impaired
          individuals navigate more safely. This is the real inspiration for SenseSpace — turning a single hardware
          prototype into an interactive space for exploring how sensor-based accessibility devices behave, fail,
          and improve.
        </p>
        <div className="bg-blue/5 border border-blue/20 rounded-lg p-3 mt-4">
          <p className="text-xs text-blue-deep">
            Note: No measured accuracy, user testing, medical validation, commercial deployment, or performance
            statistics are claimed for the original project. SenseSpace is a simulation and does not replace
            professional assistive technology or real-world safety validation.
          </p>
        </div>
      </Section>

      {/* Engineering & Technical */}
      <Section title="Engineering and Technical Experience" icon={Wrench}>
        <ul className="space-y-2 text-sm text-ink-soft">
          <li className="flex gap-2"><span className="text-teal">·</span> Hardware programming with Arduino Uno.</li>
          <li className="flex gap-2"><span className="text-teal">·</span> Ultrasonic sensor integration and calibration.</li>
          <li className="flex gap-2"><span className="text-teal">·</span> Obstacle detection algorithm design.</li>
          <li className="flex gap-2"><span className="text-teal">·</span> Alert mechanism development for accessibility.</li>
          <li className="flex gap-2"><span className="text-teal">·</span> SenseSpace: a full-stack interactive simulation laboratory.</li>
        </ul>
      </Section>

      {/* Research */}
      <Section title="Research and Innovation" icon={Microscope}>
        <div className="space-y-3">
          <ResearchItem
            status="Pending"
            title="Patent application filed"
            desc="Co-development of an innovative instrument for which a patent application has been filed and is pending review."
          />
          <ResearchItem
            status="Under publication"
            title="Dentistry research article"
            desc="Data compilation and research assistance for a dentistry-related article under publication."
          />
        </div>
      </Section>

      {/* Achievements */}
      <Section title="Academic Achievements" icon={Medal}>
        <div className="grid sm:grid-cols-2 gap-2">
          <Achievement icon={Award} text="Scholar Badge of Excellence — received consistently throughout school" />
          <Achievement icon={Trophy} text="Gold Medal for Academic Excellence in Grade 11" />
          <Achievement icon={Medal} text="Regional Rank 3 and School Rank 1 in Vigyan Vidyarthi Manthan" />
          <Achievement icon={Award} text="Second prize in a national-level photography competition" />
          <Achievement icon={Award} text="Certificate of Recognition in a World Environment Day global quiz" />
          <Achievement icon={Award} text="Certificate of Distinction in the CMS Environmental Quiz Competition" />
          <Achievement icon={Trophy} text="Contribution to the winning team at the Inter-School Luminaire Competition (Rolling Trophy)" />
          <Achievement icon={Medal} text="Bronze medal in the Inter-School Swimming Competition, 2024" />
        </div>
      </Section>

      {/* Leadership */}
      <Section title="Leadership and Community Impact" icon={Users}>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <HandHeart size={18} className="text-teal-deep mt-0.5 shrink-0" />
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">Secretary of the Interact Club.</span> Leadership in community
              outreach, fundraising, volunteer coordination, and social impact initiatives. Received a Letter of
              Recommendation from the Interact Club.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <HandHeart size={18} className="text-teal-deep mt-0.5 shrink-0" />
            <p className="text-sm text-ink-soft">
              Fundraising activities supporting orphanages, elderly care, and social welfare.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <GraduationCap size={18} className="text-teal-deep mt-0.5 shrink-0" />
            <p className="text-sm text-ink-soft">
              Designed and conducted a financial literacy workshop for government-school students.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <HandHeart size={18} className="text-teal-deep mt-0.5 shrink-0" />
            <p className="text-sm text-ink-soft">
              Paper recycling and textile sustainability initiatives.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <HandHeart size={18} className="text-teal-deep mt-0.5 shrink-0" />
            <p className="text-sm text-ink-soft">
              Volunteer work at Earth Saviours Foundation, supporting homeless and elderly residents through
              caregiving, reading sessions, medicine distribution, and other day-to-day support.
            </p>
          </div>
        </div>
      </Section>

      {/* Why SenseSpace */}
      <Section title="Why SenseSpace Exists" icon={GraduationCap}>
        <p className="text-sm text-ink-soft leading-relaxed">
          The smart-hat project sparked an interest in exploring sensor behavior, accessibility, and the iterative
          process of engineering. A single prototype answers one question; SenseSpace asks what happens when you
          change the variables. What if the detection angle is wider? What if the noise is higher? What if the
          battery is smaller? By turning the smart hat into a configurable simulation, SenseSpace makes the
          engineering process itself the subject of study.
        </p>
        <p className="text-sm text-ink-soft leading-relaxed mt-3">
          This is project context — not an invented quotation or an unverified personal story. No additional
          internships, awards, personal details, or professional experience have been added beyond what is
          documented here.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Wrench; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-ink/5 flex items-center justify-center">
          <Icon size={16} className="text-blue" />
        </div>
        <h2 className="font-display text-xl text-ink">{title}</h2>
      </div>
      <Card className="p-5">{children}</Card>
    </section>
  );
}

function GradeRow({ grade, score }: { grade: string; score: string }) {
  return (
    <div className="flex items-center justify-between py-1 px-2 rounded bg-softwhite border border-line">
      <span className="text-sm text-muted">{grade}</span>
      <span className="font-mono text-sm font-medium text-ink tabular-nums">{score}</span>
    </div>
  );
}

function ProjectComponent({ icon: Icon, title, desc }: { icon: typeof Cpu; title: string; desc: string }) {
  return (
    <div className="bg-softwhite border border-line rounded-lg p-3">
      <Icon size={20} className="text-clay mb-2" />
      <h4 className="text-sm font-medium text-ink">{title}</h4>
      <p className="text-xs text-muted mt-0.5">{desc}</p>
    </div>
  );
}

function ResearchItem({ status, title, desc }: { status: string; title: string; desc: string }) {
  return (
    <div className="border border-line rounded-lg p-3 bg-softwhite">
      <div className="flex items-center gap-2 mb-1">
        <Badge tone="clay">{status}</Badge>
        <h4 className="text-sm font-medium text-ink">{title}</h4>
      </div>
      <p className="text-xs text-muted">{desc}</p>
    </div>
  );
}

function Achievement({ icon: Icon, text }: { icon: typeof Award; text: string }) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 bg-softwhite border border-line rounded-lg">
      <Icon size={16} className="text-teal-deep mt-0.5 shrink-0" />
      <span className="text-sm text-ink-soft">{text}</span>
    </div>
  );
}
