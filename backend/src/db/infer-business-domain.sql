-- ============================================================
-- Infer business_domain for ideas where it is currently NULL
-- Uses keyword matching on name + description (case-insensitive)
-- Safe to re-run: only touches rows WHERE business_domain IS NULL
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/infer-business-domain.sql
-- ============================================================

UPDATE ideas
SET business_domain = CASE

  -- Fintech
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%payment%','%banking%','%finance%','%financial%','%invest%','%crypto%',
    '%wallet%','%lending%','%insurance%','%trading%','%transaction%','%remittance%',
    '%fintech%','%credit%','%loan%','%mortgage%','%tax%','%accounting%','%payroll%'
  ]) THEN 'fintech'

  -- Healthtech
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%health%','%medical%','%doctor%','%patient%','%clinical%','%therapy%',
    '%wellness%','%mental health%','%hospital%','%diagnostic%','%telemedicine%',
    '%telehealth%','%nurse%','%midwife%','%maternal%','%nutrition%','%diet%',
    '%fitness%','%workout%','%gym%','%physio%','%dental%','%pharmaceutical%'
  ]) THEN 'healthtech'

  -- Edtech
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%learn%','%education%','%school%','%student%','%course%','%tutor%',
    '%training%','%skill%','%teach%','%classroom%','%bootcamp%','%curriculum%',
    '%university%','%college%','%quiz%','%exam%','%certification%','%upskill%',
    '%interview coaching%','%coding bootcamp%'
  ]) THEN 'edtech'

  -- Cleantech
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%energy%','%solar%','%carbon%','%sustainab%','%climate%','%renewable%',
    '%green%','%electric vehicle%',' %EV %','%emissions%','%cleantech%',
    '%recycl%','%waste%','%net zero%','%hydrogen%','%wind power%','%clean energy%'
  ]) THEN 'cleantech'

  -- Proptech
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%property%','%real estate%','%rental%','%housing%','%landlord%','%tenant%',
    '%proptech%','%short-term rental%','%airbnb%','%letting%','%flat%','%apartment%',
    '%building%','%construction%','%architecture%','%smart home%','%home energy%'
  ]) THEN 'proptech'

  -- Dev Tools
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%developer%','% api %','%devtool%','%deployment%','%CI/CD%','%monitoring%',
    '%debugging%','%code review%','%open source%','%github%','%infrastructure%',
    '%cloud%','%serverless%','%microservice%','%devops%','%kubernetes%','%docker%',
    '%observability%','%logging%','%software development%'
  ]) THEN 'devtools'

  -- Legaltech
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%legal%','%contract%','% law %','%compliance%','%e-signature%','%esignature%',
    '%notari%','%solicitor%','%attorney%','%trademark%','%intellectual property%',
    '%regulatory%','%gdpr%','%privacy%','%dispute%','%court%','%legaltech%'
  ]) THEN 'legaltech'

  -- Foodtech
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%food%','%restaurant%','%meal%','%recipe%','%grocery%','%delivery%',
    '%kitchen%','%chef%','%catering%','%beverage%','%drink%','%wine%','%beer%',
    '%snack%','%diet plan%','%meal plan%','%foodtech%','%cafe%','%bakery%'
  ]) THEN 'foodtech'

  -- HR Tech
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '% hr %','%human resource%','%hiring%','%recruit%','%employee%','%talent%',
    '%workforce%','%onboard%','%payroll%','%hr-tech%','%hrtech%','%people ops%',
    '%performance review%','%org chart%','%headcount%','%background check%'
  ]) THEN 'hr-tech'

  -- Logistics
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%logistics%','%delivery%','%shipping%','%fleet%','%supply chain%','%transport%',
    '%freight%','%warehouse%','%last mile%','%courier%','%tracking%','%dispatch%',
    '%route optim%','%tyre%','%tire%','%haulage%','%cargo%'
  ]) THEN 'logistics'

  -- Media
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%podcast%','%content creat%','%media%','%video%','%audio%','%newsletter%',
    '%streaming%','%broadcast%','%journalism%','%publishing%','%social media%',
    '%influencer%','%creator%','%show notes%','%music%','%film%','%animation%'
  ]) THEN 'media'

  -- Agritech
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%farm%','%agricultur%','%crop%','%soil%','%harvest%','%agritech%',
    '%livestock%','%irrigation%','%precision farming%','%agtech%','%rural%'
  ]) THEN 'agritech'

  -- Marketplace
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%marketplace%','%platform%','%peer-to-peer%','%p2p%','%buy and sell%',
    '%two-sided%','%connect%buyers%','%connect%sellers%','%matching platform%',
    '%gig%','%freelance platform%','%on-demand%'
  ]) THEN 'marketplace'

  -- B2B SaaS (broad catch for business software)
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%saas%','%b2b%','%enterprise%','%analytics%','%dashboard%','%reporting%',
    '%automation%','%workflow%','%crm%','%erp%','%subscription management%',
    '%business software%','%productivity%','%collaboration%','%project management%'
  ]) THEN 'b2b-saas'

  -- Consumer (catch-all for consumer-facing apps)
  WHEN (name || ' ' || COALESCE(description,'')) ILIKE ANY(ARRAY[
    '%consumer%','%personal%','%lifestyle%','%dating%','%social%','%community app%',
    '%mobile app%','%habit%','%wellbeing%','%gaming%','%entertainment%','%travel%',
    '%fashion%','%beauty%','%pet%'
  ]) THEN 'consumer'

  ELSE NULL
END
WHERE business_domain IS NULL;

-- Report how many were updated vs still unknown
SELECT
  COUNT(*) FILTER (WHERE business_domain IS NOT NULL) AS inferred,
  COUNT(*) FILTER (WHERE business_domain IS NULL)     AS still_unknown,
  COUNT(*)                                             AS total
FROM ideas;
