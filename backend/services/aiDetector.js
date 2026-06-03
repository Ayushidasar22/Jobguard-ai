// ============================================================
// JobGuard AI — AI Detection Service (Uses Claude API)
// ============================================================
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyzes a job listing for signs of fraud using Claude AI.
 * @param {Object} jobData - The job listing details
 * @returns {Object} - Risk score, verdict, red flags, and analysis
 */
async function detectFakeJob(jobData) {
  const { title, company, description, salary, requirements, contactEmail, companyWebsite, location } = jobData;

  const prompt = `You are an expert fraud analyst specializing in fake job detection. Analyze the following job listing carefully and determine if it is REAL or FAKE/SCAM.

JOB LISTING DETAILS:
- Title: ${title || "Not provided"}
- Company: ${company || "Not provided"}
- Location: ${location || "Not provided"}
- Salary: ${salary || "Not provided"}
- Description: ${description || "Not provided"}
- Requirements: ${Array.isArray(requirements) ? requirements.join(", ") : (requirements || "Not provided")}
- Contact Email: ${contactEmail || "Not provided"}
- Company Website: ${companyWebsite || "Not provided"}

ANALYSIS INSTRUCTIONS:
Evaluate this job listing based on these fraud indicators:

RED FLAGS (signs of fake job):
1. Unrealistic salary promises (too high for role/location)
2. Vague job description with no specific responsibilities
3. Grammar/spelling errors and excessive punctuation (!!!, $$$)
4. Requesting upfront fees, payments, or personal financial info
5. Generic free email addresses (gmail/yahoo for company email)
6. No company website or vague company info
7. "No experience needed" for high-paying roles
8. Pressure tactics ("urgent", "limited slots", "act now")
9. Too-good-to-be-true promises
10. Requesting sensitive personal information early

POSITIVE SIGNALS (signs of real job):
1. Specific job responsibilities and requirements
2. Professional company email domain
3. Verifiable company website
4. Realistic salary for the role/location
5. Clear application process
6. Specific skill requirements
7. Legitimate benefits package
8. Professional language and formatting

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "riskScore": <number 0-100, where 0=definitely real, 100=definitely fake>,
  "verdict": "<SAFE | SUSPICIOUS | FAKE>",
  "confidence": "<LOW | MEDIUM | HIGH>",
  "summary": "<2-3 sentence overall assessment>",
  "redFlags": ["<flag1>", "<flag2>", ...],
  "positiveSignals": ["<signal1>", "<signal2>", ...],
  "recommendation": "<specific advice for the job seeker>",
  "detailedAnalysis": {
    "salaryAnalysis": "<analysis of salary>",
    "companyAnalysis": "<analysis of company legitimacy>",
    "descriptionAnalysis": "<analysis of job description>",
    "contactAnalysis": "<analysis of contact information>"
  }
}`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].text.trim();
    
    // Parse JSON response
    let analysis;
    try {
      // Remove any markdown code blocks if present
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      analysis = JSON.parse(cleanJson);
    } catch (parseError) {
      // Fallback: extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    // Ensure all required fields exist
    return {
      riskScore: analysis.riskScore || 50,
      verdict: analysis.verdict || "SUSPICIOUS",
      confidence: analysis.confidence || "MEDIUM",
      summary: analysis.summary || "Analysis could not be completed.",
      redFlags: analysis.redFlags || [],
      positiveSignals: analysis.positiveSignals || [],
      recommendation: analysis.recommendation || "Proceed with caution.",
      detailedAnalysis: analysis.detailedAnalysis || {},
      analyzedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error("AI Detection Error:", error.message);
    
    // Fallback rule-based detection if AI fails
    return fallbackDetection(jobData);
  }
}

/**
 * Rule-based fallback detection when AI API is unavailable
 */
function fallbackDetection(jobData) {
  const { title = "", description = "", salary = "", contactEmail = "", companyWebsite = "" } = jobData;
  
  let riskScore = 20;
  const redFlags = [];
  const positiveSignals = [];

  const fullText = `${title} ${description} ${salary}`.toLowerCase();

  // Check red flags
  if (/\$\$\$|!!!|urgent|guaranteed|easy money|no experience needed/i.test(fullText)) {
    riskScore += 30;
    redFlags.push("Uses excessive punctuation and urgency tactics");
  }
  if (/registration fee|pay.*start|advance.*payment|send money/i.test(fullText)) {
    riskScore += 40;
    redFlags.push("Requests upfront payment from applicant");
  }
  if (contactEmail && /@gmail|@yahoo|@hotmail/i.test(contactEmail)) {
    riskScore += 15;
    redFlags.push("Uses free email service for company contact");
  }
  if (!companyWebsite) {
    riskScore += 10;
    redFlags.push("No company website provided");
  }
  if (/\$[0-9]+,?000.*week|earn.*5000.*week/i.test(fullText)) {
    riskScore += 25;
    redFlags.push("Unrealistically high salary promises");
  }

  // Check positive signals
  if (companyWebsite && companyWebsite.startsWith("http")) {
    riskScore -= 10;
    positiveSignals.push("Company website provided");
  }
  if (contactEmail && !/@gmail|@yahoo|@hotmail/i.test(contactEmail)) {
    riskScore -= 5;
    positiveSignals.push("Professional email domain");
  }

  riskScore = Math.max(0, Math.min(100, riskScore));

  let verdict = "SAFE";
  if (riskScore > 70) verdict = "FAKE";
  else if (riskScore > 40) verdict = "SUSPICIOUS";

  return {
    riskScore,
    verdict,
    confidence: "LOW",
    summary: "This analysis was performed using basic rule-based detection (AI service temporarily unavailable). Results may be less accurate.",
    redFlags,
    positiveSignals,
    recommendation: verdict === "FAKE" ? "Do NOT apply. This shows multiple signs of a scam job posting." : "Exercise caution and verify the company independently before applying.",
    detailedAnalysis: {
      salaryAnalysis: "Automated salary check performed.",
      companyAnalysis: "Automated company legitimacy check performed.",
      descriptionAnalysis: "Automated description scan performed.",
      contactAnalysis: "Automated contact info check performed."
    },
    analyzedAt: new Date().toISOString(),
    fallback: true
  };
}

module.exports = { detectFakeJob };