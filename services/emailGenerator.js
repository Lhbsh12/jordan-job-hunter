/**
 * Smart Tailored Outreach Email Generator
 * Synthesizes personalized cold outreach emails matching candidate skills to job requirements.
 * Supports smart algorithmic synthesis (zero cost, zero API keys) + optional LLM APIs (OpenAI, Groq, Anthropic, Ollama).
 */

const GENERAL_TECH_KEYWORDS = [
  'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'golang', 'rust', 'php', 'ruby', 'swift', 'kotlin',
  'react', 'next.js', 'vue', 'angular', 'svelte', 'html', 'css', 'tailwind', 'bootstrap',
  'node.js', 'express', 'nest.js', 'fastapi', 'django', 'flask', 'spring boot', 'asp.net', 'laravel',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'prisma', 'typeorm',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'ci/cd', 'git', 'github', 'terraform', 'linux',
  'rest api', 'graphql', 'grpc', 'microservices', 'unit testing', 'jest', 'cypress', 'selenium',
  'pandas', 'numpy', 'scikit-learn', 'pytorch', 'tensorflow', 'machine learning', 'deep learning', 'nlp', 'computer vision', 'tableau', 'power bi',
  'agile', 'scrum', 'jira', 'figma'
];

function extractMatchedSkills(jobDescription, candidateSkills, resumeText) {
  const combinedCandidateText = ((candidateSkills || '') + ' ' + (resumeText || '')).toLowerCase();
  const jdLower = (jobDescription || '').toLowerCase();

  const matched = [];

  // 1. Direct candidate skill token matches in JD
  if (candidateSkills) {
    const userTokens = candidateSkills.split(/[,;\n•]+/).map(s => s.trim()).filter(Boolean);
    for (const token of userTokens) {
      const tokenLower = token.toLowerCase();
      if (tokenLower.length > 1 && jdLower.includes(tokenLower)) {
        if (!matched.some(m => m.toLowerCase() === tokenLower)) {
          matched.push(token);
        }
      }
    }
  }

  // 2. Cross-reference general keywords
  for (const kw of GENERAL_TECH_KEYWORDS) {
    if (jdLower.includes(kw) && combinedCandidateText.includes(kw)) {
      const clean = kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!matched.some(m => m.toLowerCase() === kw)) {
        matched.push(clean);
      }
    }
  }

  // 3. Fallback to candidate's top listed skills if direct matches are few
  if (matched.length < 2 && candidateSkills) {
    const userTokens = candidateSkills.split(/[,;\n•]+/).map(s => s.trim()).filter(Boolean);
    for (const t of userTokens.slice(0, 3)) {
      if (!matched.some(m => m.toLowerCase() === t.toLowerCase())) {
        matched.push(t);
      }
    }
  }

  return matched.slice(0, 5);
}

function generateAlgorithmicEmail({ candidate, job, tone = 'direct' }) {
  const candidateName = candidate.name || 'Candidate';
  const role = job.roleTitle || 'Open Position';
  const company = job.company || 'your team';
  const contactName = job.contactName && job.contactName.trim().length > 0 ? job.contactName.trim() : null;
  const greeting = contactName ? `Hi ${contactName},` : `Hi ${company} Hiring Team,`;

  const matchedSkills = extractMatchedSkills(job.jobDescription, candidate.skills, candidate.resumeText);
  const skillsStr = matchedSkills.length > 0 ? matchedSkills.join(', ') : (candidate.skills || 'core engineering principles');

  const major = candidate.major || 'Computer Science / Engineering';
  let degree = `background in ${major}`;
  if (candidate.degree) {
    if (candidate.degree.toLowerCase().includes('in ') || candidate.degree.toLowerCase().includes(major.toLowerCase())) {
      degree = candidate.degree;
    } else {
      degree = `${candidate.degree} in ${major}`;
    }
  }

  // Pick best project summary
  let projectSnippet = '';
  if (candidate.projects && candidate.projects.trim().length > 0) {
    const firstProject = candidate.projects.split('\n')[0].replace(/^[-*•\d.]+\s*/, '').trim();
    projectSnippet = firstProject;
  }

  let subject = '';
  let body = '';

  if (tone === 'project') {
    subject = `${role} at ${company} - ${candidateName} | ${matchedSkills.slice(0, 2).join(' & ') || major}`;
    body = `${greeting}

I have been following ${company}'s work and noticed your opening for a ${role}. Given your focus on impactful solutions, I wanted to reach out directly.

I hold a ${degree} with hands-on experience building and delivering reliable solutions using ${skillsStr}.

${projectSnippet ? `Most recently, I worked on:
• ${projectSnippet}` : `In my recent work, I developed end-to-end projects—handling system design, implementation, and rigorous testing to drive measurable results.`}

I would welcome the opportunity to learn more about the immediate priorities your team is tackling at ${company} and discuss how my technical foundation and problem-solving skills could contribute.

Would you be open to a brief 10-minute introductory conversation next week?

Best regards,

${candidateName}
${candidate.email || ''} | ${candidate.phone || ''}
${candidate.linkedin ? `LinkedIn: ${candidate.linkedin}` : ''}
${candidate.github ? `GitHub: ${candidate.github}` : ''}
${candidate.portfolio ? `Portfolio: ${candidate.portfolio}` : ''}`.trim();

  } else if (tone === 'enthusiastic') {
    subject = `${role} role at ${company} - ${candidateName} introduction & application`;
    body = `${greeting}

I hope this message finds you well! I recently came across the ${role} position at ${company} and felt compelled to reach out because your product direction strongly resonates with my background and career goals.

With my ${degree}, I specialize in building robust solutions and scalable implementations using ${skillsStr}.

${projectSnippet ? `One project I am particularly proud of:
• ${projectSnippet}` : `I have built end-to-end workflows, focusing on clean architecture, continuous improvement, and delivering features that optimize core team metrics.`}

I admire ${company}'s trajectory and would love to bring my proactive mindset and dedication to your initiatives. Attached/linked is my resume for your review.

Do you have 10-15 minutes in your schedule over the coming days for a quick chat?

Thank you for your time and consideration!

Warm regards,

${candidateName}
${candidate.email || ''} | ${candidate.phone || ''}
${candidate.linkedin ? `LinkedIn: ${candidate.linkedin}` : ''}
${candidate.github ? `GitHub: ${candidate.github}` : ''}
${candidate.portfolio ? `Portfolio: ${candidate.portfolio}` : ''}`.trim();

  } else {
    // Default 'direct' / concise tone (highest open & reply rates)
    subject = `${role} inquiry - ${candidateName} (${major})`;
    body = `${greeting}

I am reaching out regarding the ${role} opportunity at ${company}. With a ${degree} and proficiency in ${skillsStr}, I believe I can hit the ground running on your team's upcoming roadmaps.

A quick snapshot of my qualifications:
• Strong core technical foundation with a focus on clean, maintainable, and well-tested code.
• Proven capability taking requirements from initial specification through implementation and validation.
${projectSnippet ? `• Project highlight: ${projectSnippet}` : `• Experience delivering technical projects that translate specifications into clear user and business value.`}

I have attached my resume and would appreciate 10 minutes to discuss how my skill set aligns with ${company}'s immediate hiring needs.

Thanks for your time,

${candidateName}
${candidate.email || ''} | ${candidate.phone || ''}
${candidate.linkedin ? `LinkedIn: ${candidate.linkedin}` : ''}
${candidate.github ? `GitHub: ${candidate.github}` : ''}
${candidate.portfolio ? `Portfolio: ${candidate.portfolio}` : ''}`.trim();
  }

  return { subject, body, method: 'algorithmic-tailor-engine' };
}

/**
 * Optional LLM-driven generation when user supplies an API key (OpenAI, Anthropic, Groq, Ollama)
 */
async function generateLlmEmail({ candidate, job, tone, apiKey, provider = 'openai', modelName, baseUrl }) {
  const prompt = `You are an elite career coach and executive recruiter.
Write a personalized, highly compelling cold outreach email from a job candidate to a hiring manager or recruiter.

RULES:
1. Subject line must be concise, relevant, and avoid generic spam words.
2. The tone must be ${tone || 'direct, professional, and impact-driven'}.
3. Tailor the email strictly to the target role and company. Highlight intersections between the candidate's skills/projects and the job requirements.
4. Keep the body between 110 and 160 words. Busy managers do not read long emails.
5. End with a polite, low-pressure call to action (e.g. 10-minute chat).
6. Format output strictly as JSON with two keys: "subject" and "body".

CANDIDATE INFO:
Name: ${candidate.name || 'Candidate'}
Degree/Major: ${candidate.degree || ''} in ${candidate.major || 'Engineering'} (${candidate.university || ''})
Core Skills: ${candidate.skills || ''}
Projects: ${candidate.projects || ''}
Experience/Bio: ${candidate.experience || ''}
Resume Summary: ${candidate.resumeText || ''}
Links: LinkedIn: ${candidate.linkedin || ''}, GitHub: ${candidate.github || ''}, Portfolio: ${candidate.portfolio || ''}
Email: ${candidate.email || ''}, Phone: ${candidate.phone || ''}

JOB TARGET:
Company: ${job.company || ''}
Role Title: ${job.roleTitle || 'Open Position'}
Contact Person: ${job.contactName || 'Hiring Team'}
Contact Email: ${job.contactEmail || ''}
Job Description / Requirements:
${job.jobDescription || ''}
Notes: ${job.notes || ''}

Respond with ONLY the JSON object.`;

  if (provider === 'openai' || provider === 'groq') {
    const url = provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : (baseUrl || 'https://api.openai.com/v1/chat/completions');
    const model = modelName || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${provider.toUpperCase()} API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    return { subject: parsed.subject, body: parsed.body, method: `${provider}-${model}` };
  }

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelName || 'claude-3-5-haiku-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt + '\nReturn ONLY JSON.' }]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const raw = data.content[0].text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return { subject: parsed.subject, body: parsed.body, method: 'anthropic' };
  }

  if (provider === 'ollama') {
    const host = baseUrl || 'http://localhost:11434';
    const res = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName || 'llama3',
        prompt: prompt + '\nReturn valid JSON only with keys "subject" and "body".',
        stream: false,
        format: 'json'
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status}`);
    }

    const data = await res.json();
    const parsed = JSON.parse(data.response);
    return { subject: parsed.subject, body: parsed.body, method: 'ollama-local' };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

async function generateTailoredMessage({ candidate, job, options = {} }) {
  const { tone = 'direct', apiKey, provider = 'local', modelName, baseUrl } = options;

  if (apiKey && provider !== 'local') {
    try {
      return await generateLlmEmail({ candidate, job, tone, apiKey, provider, modelName, baseUrl });
    } catch (err) {
      console.warn(`LLM generation failed (${err.message}). Falling back to algorithmic engine.`);
      const fallback = generateAlgorithmicEmail({ candidate, job, tone });
      fallback.warning = `LLM error (${err.message}). Generated using smart algorithmic engine.`;
      return fallback;
    }
  }

  return generateAlgorithmicEmail({ candidate, job, tone });
}

module.exports = {
  generateTailoredMessage,
  extractMatchedSkills
};
