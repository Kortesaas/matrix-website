/**
 * The FSJ page (/fsj/) and the FSJ teasers on Team and Mitmachen. The
 * volunteers themselves (names, photos) are edited in the admin area under
 * "Team", group "Die FSJler"; this file only holds the texts about the FSJ.
 */
import groupStage from '../assets/youth/group-stage.png';

export const fsjPage = {
  href: '/fsj/',
  // TODO: check the details (start, pocket money, application) with the team.
  intro: 'Ein Jahr lang mitten im Geschehen: Im Freiwilligen Sozialen Jahr (FSJ) arbeitest du im Team der MatriX mit, planst Projekte und Events und bist für die Jugendlichen da.',
  what: {
    title: 'Was ist ein FSJ?',
    text: 'Das Freiwillige Soziale Jahr ist ein Bildungs- und Orientierungsjahr nach der Schule. Du arbeitest zwölf Monate in einer sozialen Einrichtung mit, bekommst ein Taschengeld und besuchst Seminare zusammen mit anderen Freiwilligen.\n\nBei uns heißt das: Offener Betrieb, Events, Werkstatt, Musik und ganz viel Kontakt mit Jugendlichen. Du findest heraus, ob ein sozialer Beruf zu dir passt, und kannst eigene Ideen umsetzen.',
    image: groupStage,
    alt: 'Gruppenfoto von Jugendlichen auf der Bühne der MatriX',
  },
  facts: [
    { label: 'Dauer', value: '12 Monate' },
    { label: 'Start', value: 'jedes Jahr im September' },
    { label: 'Alter', value: 'nach der Schule bis 26' },
    { label: 'Dazu', value: 'Taschengeld & Seminare' },
  ],
  tasks: [
    'Im Offenen Betrieb da sein: zuhören, mitspielen, Ansprechperson sein',
    'Events, Turniere und Ferienprogramm mitplanen und durchziehen',
    'An der X-Bar und beim Verleih mithelfen',
    'Ein eigenes Projekt umsetzen, zum Beispiel einen Workshop',
  ],
  volunteers: {
    title: 'Frag unsere FSJler',
    lead: 'Wer gerade sein FSJ bei uns macht, erzählt dir am besten selbst, wie so ein Jahr in der MatriX aussieht. Komm vorbei und sprich sie an!',
  },
  apply: {
    title: 'Bock auf ein Jahr MatriX?',
    lead: 'Schreib uns ein paar Sätze über dich und warum du dein FSJ bei uns machen willst. Oder komm während der Öffnungszeiten vorbei und frag einfach nach.',
    subject: 'Bewerbung FSJ',
  },
  teaser: {
    title: 'Dein FSJ in der MatriX',
    text: 'Nach der Schule ein Jahr lang Jugendarbeit ausprobieren, Events planen und Teil des Teams sein? Jeden September starten bei uns neue FSJler.',
    label: 'Mehr zum FSJ',
  },
};
